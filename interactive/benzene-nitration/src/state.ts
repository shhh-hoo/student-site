import type { MechanismDemoState, MechanismFixture, MechanismPanelData } from "./types";

export function createMechanismDemoState(fixture: MechanismFixture, initialPanelIndex = 0): MechanismDemoState {
  const panelCount = fixture.panels.length;
  const activePanelIndex = Math.min(Math.max(initialPanelIndex, 0), panelCount - 1);

  return {
    fixture,
    activePanelIndex,
  };
}

export function getActivePanel(state: MechanismDemoState): MechanismPanelData {
  return state.fixture.panels[state.activePanelIndex];
}

export function getStepIndicator(state: MechanismDemoState): string {
  return `${state.activePanelIndex + 1} / ${state.fixture.panels.length}`;
}

export function movePanel(state: MechanismDemoState, direction: number): MechanismDemoState {
  return createMechanismDemoState(state.fixture, state.activePanelIndex + direction);
}

export function setPanelIndex(state: MechanismDemoState, panelIndex: number): MechanismDemoState {
  return createMechanismDemoState(state.fixture, panelIndex);
}
