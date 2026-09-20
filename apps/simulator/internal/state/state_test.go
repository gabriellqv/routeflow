package state

import "testing"

func TestTransitionHappyPath(t *testing.T) {
	m := NewMachine(StatusIdle)

	cases := []Status{
		StatusInRoute,
		StatusStopped,
		StatusInRoute,
		StatusIdle,
	}
	for _, next := range cases {
		if !m.Transition(next) {
			t.Fatalf("transição para %q deveria ser válida a partir de %q", next, m.Status())
		}
	}
}

func TestTransitionFaultAndMaintenance(t *testing.T) {
	m := NewMachine(StatusInRoute)

	if !m.Transition(StatusFault) {
		t.Fatal("in_route -> fault deveria ser válida")
	}
	if !m.Transition(StatusMaintenance) {
		t.Fatal("fault -> maintenance deveria ser válida")
	}
	if !m.Transition(StatusIdle) {
		t.Fatal("maintenance -> idle deveria ser válida")
	}
}

func TestTransitionInvalidIsIgnored(t *testing.T) {
	m := NewMachine(StatusIdle)

	if m.Transition(StatusStopped) {
		t.Fatal("idle -> stopped não deveria ser válida")
	}
	if m.Status() != StatusIdle {
		t.Fatalf("status deveria permanecer idle, atual: %q", m.Status())
	}
}
