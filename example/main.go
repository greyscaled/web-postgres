package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"time"

	"github.com/go-chi/chi"
	"github.com/gorilla/websocket"
)

const (
	handshakeTimeout = time.Second * 30
	pongWait         = 60 * time.Second
	pingPeriod       = (pongWait * 9) / 10 // Must be less than pongWait
	writeWait        = 10 * time.Second
)

func main() {
	r := chi.NewRouter()
	r.HandleFunc("/proxy", wsTcpProxy())
	http.ListenAndServe(":8080", r)
}

func wsTcpProxy() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		address := r.URL.Query().Get("address")
		if address == "" {
			writeBadRequest(w, "address is a required parameter")
			return
		}

		upgrader := websocket.Upgrader{
			HandshakeTimeout: handshakeTimeout,
			CheckOrigin: func(_r *http.Request) bool {
				return true
			},
		}

		tcpConn, err := net.Dial("tcp", address)
		if err != nil {
			writeInternalErr(w, err)
			return
		}
		defer tcpConn.Close()

		wsConn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			writeInternalErr(w, err)
			return
		}
		defer wsConn.Close()
		_ = wsConn.SetReadDeadline(time.Now().Add(pongWait))
		wsConn.SetPongHandler(func(string) error {
			_ = wsConn.SetReadDeadline(time.Now().Add(pongWait))
			return nil
		})

		go func() {
			ticker := time.NewTicker(pingPeriod)
			defer ticker.Stop()
			for {
				select {
				case <-ticker.C:
					err := wsConn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(writeWait))
					if err != nil {
						fmt.Println(fmt.Errorf("ping: %w", err))
					}
				case <-r.Context().Done():
					return
				}
			}
		}()

		go func() {
			defer func() {
				err := wsConn.WriteControl(
					websocket.CloseMessage,
					websocket.FormatCloseMessage(websocket.CloseNormalClosure, "tcp connection closed"),
					time.Now().Add(writeWait),
				)
				if err != nil {
					fmt.Println(fmt.Errorf("close tcp: %w", err))
				}
			}()

			const bufferSize = 32 * 1024
			buf := make([]byte, bufferSize)

			for {
				select {
				case <-r.Context().Done():
					return
				default:
					n, err := tcpConn.Read(buf)
					if err != nil {
						fmt.Println(fmt.Errorf("read socket: %w", err))
						return
					}
					rawMessage := buf[:n]

					err = wsConn.WriteMessage(websocket.BinaryMessage, rawMessage)
					if err != nil {
						fmt.Println(fmt.Errorf("write ws: %w", err))
						return
					}
				}
			}
		}()

		for {
			select {
			case <-r.Context().Done():
				return
			default:
				messageType, b, err := wsConn.ReadMessage()
				if err != nil {
					fmt.Println(fmt.Errorf("read ws: %w", err))
					return
				}
				if messageType == websocket.CloseMessage {
					return
				}

				_, err = io.Copy(tcpConn, bytes.NewReader(b))
				if err != nil {
					fmt.Println(fmt.Errorf("write socket: %w", err))
					return
				}
			}
		}
	}
}

type ErrorResponse struct {
	Msg string `json:"msg"`
}

func writeJSON(w http.ResponseWriter, msg any) {
	w.Header().Set("Content-Type", "application/json")

	err := json.NewEncoder(w).Encode(msg)
	if err != nil {
		fmt.Println(fmt.Errorf("encode: %w", err))
	}
}

func writeBadRequest(w http.ResponseWriter, msg string) {
	w.WriteHeader(http.StatusBadRequest)
	writeJSON(w, ErrorResponse{msg})
}

func writeInternalErr(w http.ResponseWriter, err error) {
	w.WriteHeader(http.StatusInternalServerError)
	writeJSON(w, ErrorResponse{err.Error()})
}
