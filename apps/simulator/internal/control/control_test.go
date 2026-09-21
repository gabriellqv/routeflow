package control

import "testing"

func TestApplyTransitions(t *testing.T) {
	controller := New(StateStopped)

	ok, state := controller.Apply(ActionStart)
	if !ok || state != StateRunning {
		t.Fatalf("start deveria ir para running: ok=%v state=%s", ok, state)
	}

	ok, state = controller.Apply(ActionPause)
	if !ok || state != StatePaused {
		t.Fatalf("pause deveria ir para paused: ok=%v state=%s", ok, state)
	}

	ok, state = controller.Apply(ActionStart)
	if !ok || state != StateRunning {
		t.Fatalf("start deveria retomar para running: ok=%v state=%s", ok, state)
	}

	ok, state = controller.Apply(ActionStop)
	if !ok || state != StateStopped {
		t.Fatalf("stop deveria ir para stopped: ok=%v state=%s", ok, state)
	}
}

func TestApplyUnknownAction(t *testing.T) {
	controller := New(StateRunning)

	ok, state := controller.Apply(Action("invalid"))
	if ok {
		t.Fatal("ação desconhecida deveria retornar ok=false")
	}
	if state != StateRunning {
		t.Fatalf("estado não deveria mudar: %s", state)
	}
}
