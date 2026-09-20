package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthOK(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := New(server.URL)

	if err := client.Health(context.Background()); err != nil {
		t.Fatalf("Health deveria ter sucesso: %v", err)
	}
}

func TestHealthError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	client := New(server.URL)

	if err := client.Health(context.Background()); err == nil {
		t.Fatal("Health deveria retornar erro para status não-200")
	}
}
