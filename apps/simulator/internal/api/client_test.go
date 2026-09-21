package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthOK(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := New(server.URL, Credentials{})

	if err := client.Health(context.Background()); err != nil {
		t.Fatalf("Health deveria ter sucesso: %v", err)
	}
}

func TestHealthError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	client := New(server.URL, Credentials{})

	if err := client.Health(context.Background()); err == nil {
		t.Fatal("Health deveria retornar erro para status não-200")
	}
}

func TestLoginStoresToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/auth/login" {
			t.Fatalf("caminho inesperado: %s", r.URL.Path)
		}
		json.NewEncoder(w).Encode(tokenResponse{AccessToken: "jwt-token"})
	}))
	defer server.Close()

	client := New(server.URL, Credentials{Email: "a@b.dev", Password: "secret"})

	if err := client.Login(context.Background()); err != nil {
		t.Fatalf("Login deveria ter sucesso: %v", err)
	}
	if client.token != "jwt-token" {
		t.Fatalf("token não armazenado: %q", client.token)
	}
}

func TestLoginError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	client := New(server.URL, Credentials{})

	if err := client.Login(context.Background()); err == nil {
		t.Fatal("Login deveria retornar erro para status não-200")
	}
}

func TestLoadVehiclesSendsAuthorization(t *testing.T) {
	var received string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		received = r.Header.Get("Authorization")
		json.NewEncoder(w).Encode([]struct{}{})
	}))
	defer server.Close()

	client := New(server.URL, Credentials{})
	client.token = "jwt-token"

	if _, err := client.LoadVehicles(context.Background()); err != nil {
		t.Fatalf("LoadVehicles deveria ter sucesso: %v", err)
	}
	if received != "Bearer jwt-token" {
		t.Fatalf("header Authorization inesperado: %q", received)
	}
}
