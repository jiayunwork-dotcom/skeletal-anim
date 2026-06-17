export interface RotationConstraintData {
  minAngle: number;
  maxAngle: number;
}

export interface BoneData {
  id: string;
  name: string;
  parentId: string | null;
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
  minAngle?: number;
  maxAngle?: number;
}

export interface SkeletonData {
  id: string;
  name: string;
  bones: BoneData[];
  rootBoneId: string;
}

export type EditMode = 'select' | 'create' | 'rotate' | 'weight' | 'ik';

export type ViewMode = 'perspective' | 'front' | 'side' | 'top';

export type RenderMode = 'solid' | 'wireframe' | 'bones' | 'weight';

export interface ViewportState {
  editMode: EditMode;
  viewMode: ViewMode;
  renderMode: RenderMode;
  showGrid: boolean;
  showAxes: boolean;
  showOnionSkin: boolean;
  onionSkinRange: number;
}
