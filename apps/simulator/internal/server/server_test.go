package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"routeflow/simulator/internal/control"
)

func TestHealthHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	NewHandler(control.New(control.StateRunning)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status inesperado: %d", rec.Code)
	}
}

func TestControlGetReturnsCurrentState(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/control", nil)
	rec := httptest.NewRecorder()

	NewHandler(control.New(control.StateRunning)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status inesperado: %d", rec.Code)
	}

	var response Response
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("resposta inválida: %v", err)
	}
	if response.State != control.StateRunning {
		t.Fatalf("estado inesperado: %s", response.State)
	}
}

func TestControlPostAppliesAction(t *testing.T) {
	body, _ := json.Marshal(Request{Action: control.ActionPause})
	req := httptest.NewRequest(http.MethodPost, "/control", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	NewHandler(control.New(control.StateRunning)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status inesperado: %d", rec.Code)
	}

	var response Response
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("resposta inválida: %v", err)
	}
	if response.State != control.StatePaused {
		t.Fatalf("estado inesperado: %s", response.State)
	}
}

func TestControlPostRejectsInvalidAction(t *testing.T) {
	body, _ := json.Marshal(Request{Action: control.Action("bogus")})
	req := httptest.NewRequest(http.MethodPost, "/control", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	NewHandler(control.New(control.StateRunning)).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status inesperado: %d", rec.Code)
	}
}

func TestControlRejectsUnsupportedMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodDelete, "/control", nil)
	rec := httptest.NewRecorder()

	NewHandler(control.New(control.StateRunning)).ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status inesperado: %d", rec.Code)
	}
}
