package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	t.Setenv("REDIS_URL", "")
	t.Setenv("API_URL", "")
	t.Setenv("SIMULATOR_PORT", "")

	cfg := Load()

	if cfg.RedisURL != "redis://localhost:6379" {
		t.Fatalf("RedisURL padrão inesperado: %q", cfg.RedisURL)
	}
	if cfg.APIURL != "http://localhost:3000" {
		t.Fatalf("APIURL padrão inesperado: %q", cfg.APIURL)
	}
	if cfg.Port != "8080" {
		t.Fatalf("Port padrão inesperado: %q", cfg.Port)
	}
}

func TestLoadFromEnv(t *testing.T) {
	t.Setenv("REDIS_URL", "redis://custom:6380")
	t.Setenv("API_URL", "http://api:4000")
	t.Setenv("SIMULATOR_PORT", "9090")

	cfg := Load()

	if cfg.RedisURL != "redis://custom:6380" {
		t.Fatalf("RedisURL inesperado: %q", cfg.RedisURL)
	}
	if cfg.APIURL != "http://api:4000" {
		t.Fatalf("APIURL inesperado: %q", cfg.APIURL)
	}
	if cfg.Port != "9090" {
		t.Fatalf("Port inesperado: %q", cfg.Port)
	}
}
