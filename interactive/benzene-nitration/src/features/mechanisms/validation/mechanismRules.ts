import type { ExpectedMechanismAction, MechanismAnnotation, MechanismScene } from "../types";

function actionMatchesAnnotation(action: ExpectedMechanismAction, annotation: MechanismAnnotation) {
  if (action.kind !== annotation.kind) {
    return false;
  }

  switch (action.kind) {
    case "curlyArrow":
      return (
        annotation.kind === "curlyArrow" &&
        annotation.fromAnchorId === action.fromAnchorId &&
        annotation.toAnchorId === action.toAnchorId &&
        (action.electronFlow ? annotation.electronFlow === action.electronFlow : true)
      );
    case "bondChange":
      return (
        annotation.kind === "bondChange" &&
        annotation.fromAnchorId === action.fromAnchorId &&
        annotation.toAnchorId === action.toAnchorId &&
        (action.change ? annotation.change === action.change : true)
      );
    case "lonePair":
    case "formalCharge":
    case "partialCharge":
    case "areniumHorseshoe":
      return annotation.kind === action.kind && annotation.anchorId === action.anchorId;
  }
}

function validateActionAnchors(scene: MechanismScene, action: ExpectedMechanismAction) {
  const errors: string[] = [];

  switch (action.kind) {
    case "curlyArrow":
    case "bondChange":
      if (!scene.anchors[action.fromAnchorId]) {
        errors.push(`${scene.id}/${action.id}: missing source anchor ${action.fromAnchorId}`);
      }
      if (!scene.anchors[action.toAnchorId]) {
        errors.push(`${scene.id}/${action.id}: missing target anchor ${action.toAnchorId}`);
      }
      break;
    case "lonePair":
    case "formalCharge":
    case "partialCharge":
    case "areniumHorseshoe":
      if (!scene.anchors[action.anchorId]) {
        errors.push(`${scene.id}/${action.id}: missing anchor ${action.anchorId}`);
      }
      break;
  }

  return errors;
}

export function validateMechanismSceneActions(scene: MechanismScene) {
  const errors: string[] = [];

  for (const annotation of scene.annotations) {
    switch (annotation.kind) {
      case "curlyArrow":
      case "dipole":
      case "bondChange":
        if (!scene.anchors[annotation.fromAnchorId]) {
          errors.push(`${scene.id}/${annotation.id}: missing source anchor ${annotation.fromAnchorId}`);
        }
        if (!scene.anchors[annotation.toAnchorId]) {
          errors.push(`${scene.id}/${annotation.id}: missing target anchor ${annotation.toAnchorId}`);
        }
        break;
      case "lonePair":
      case "formalCharge":
      case "partialCharge":
        if (!scene.anchors[annotation.anchorId]) {
          errors.push(`${scene.id}/${annotation.id}: missing anchor ${annotation.anchorId}`);
        }
        break;
      case "areniumHorseshoe":
        if (!scene.anchors[annotation.anchorId]) {
          errors.push(`${scene.id}/${annotation.id}: missing anchor ${annotation.anchorId}`);
        }
        for (const excludedAnchorId of annotation.excludedAnchorIds) {
          if (!scene.anchors[excludedAnchorId]) {
            errors.push(`${scene.id}/${annotation.id}: missing excluded anchor ${excludedAnchorId}`);
          }
        }
        break;
      case "label":
        if (annotation.anchorId && !scene.anchors[annotation.anchorId]) {
          errors.push(`${scene.id}/${annotation.id}: missing label anchor ${annotation.anchorId}`);
        }
        break;
    }
  }

  for (const action of scene.expectedActions ?? []) {
    errors.push(...validateActionAnchors(scene, action));

    if (!scene.annotations.some(annotation => actionMatchesAnnotation(action, annotation))) {
      errors.push(`${scene.id}/${action.id}: expected ${action.kind} action is not represented by an annotation`);
    }
  }

  return errors;
}

export function validateMechanismScenes(scenes: MechanismScene[]) {
  return scenes.flatMap(scene => validateMechanismSceneActions(scene));
}
