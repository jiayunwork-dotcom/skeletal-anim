import type { Skeleton } from '../skeleton/Skeleton';
import type { AnimationClip } from '../animation/AnimationClip';
import type { Bone } from '../skeleton/Bone';
import { radiansToDegrees } from '@/utils/math';

export class BvhExporter {
  export(
    skeleton: Skeleton,
    clip: AnimationClip,
    frameTime: number = 1 / 30
  ): string {
    const lines: string[] = [];
    
    lines.push('HIERARCHY');
    
    const rootBone = skeleton.getRootBone();
    if (!rootBone) {
      throw new Error('No root bone found');
    }

    this.exportBoneHierarchy(skeleton, rootBone, lines, 0);
    
    lines.push('MOTION');
    const totalFrames = clip.getTotalFrames();
    lines.push(`Frames: ${totalFrames}`);
    lines.push(`Frame Time: ${frameTime}`);

    for (let frame = 0; frame < totalFrames; frame++) {
      const frameData = this.exportFrame(skeleton, clip, frame);
      lines.push(frameData);
    }

    return lines.join('\n');
  }

  exportBoneHierarchy(
    skeleton: Skeleton,
    bone: Bone,
    lines: string[],
    depth: number
  ): void {
    const indent = '\t'.repeat(depth);
    const isEnd = skeleton.getChildren(bone.id).length === 0;

    if (!bone.parentId) {
      lines.push(`${indent}ROOT ${bone.name}`);
    } else {
      lines.push(`${indent}JOINT ${bone.name}`);
    }
    
    lines.push(`${indent}{`);
    
    const offsetX = bone.position.x;
    const offsetY = bone.position.y;
    const offsetZ = bone.position.z;
    
    lines.push(`${indent}\tOFFSET ${offsetX.toFixed(6)} ${offsetY.toFixed(6)} ${offsetZ.toFixed(6)}`);
    lines.push(`${indent}\tCHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation`);

    if (isEnd) {
      const endIndent = '\t'.repeat(depth + 1);
      lines.push(`${endIndent}End Site`);
      lines.push(`${endIndent}{`);
      lines.push(`${endIndent}\tOFFSET 0 ${bone.length.toFixed(6)} 0`);
      lines.push(`${endIndent}}`);
    } else {
      const children = skeleton.getChildren(bone.id);
      children.forEach((child) => {
        this.exportBoneHierarchy(skeleton, child, lines, depth + 1);
      });
    }

    lines.push(`${indent}}`);
  }

  exportFrame(
    skeleton: Skeleton,
    clip: AnimationClip,
    frame: number
  ): string {
    const values: number[] = [];
    const boneIds = this.getBvhBoneOrder(skeleton);
    
    const pose = clip.evaluate(frame, boneIds);

    boneIds.forEach((boneId) => {
      const bone = skeleton.getBone(boneId);
      if (!bone) return;

      const worldPos = bone.getWorldPosition(skeleton.bones);
      const rotation = pose.get(boneId) || bone.rotation;

      if (!bone.parentId) {
        values.push(worldPos.x);
        values.push(worldPos.y);
        values.push(worldPos.z);
      } else {
        values.push(0);
        values.push(0);
        values.push(0);
      }

      values.push(radiansToDegrees(rotation.z));
      values.push(radiansToDegrees(rotation.x));
      values.push(radiansToDegrees(rotation.y));
    });

    return values.map((v) => v.toFixed(6)).join(' ');
  }

  getBvhBoneOrder(skeleton: Skeleton): string[] {
    const order: string[] = [];
    
    const traverse = (boneId: string) => {
      order.push(boneId);
      const children = skeleton.getChildren(boneId);
      children.forEach((child) => traverse(child.id));
    };

    const rootBone = skeleton.getRootBone();
    if (rootBone) {
      traverse(rootBone.id);
    }

    return order;
  }

  download(
    skeleton: Skeleton,
    clip: AnimationClip,
    filename: string = 'animation.bvh'
  ): void {
    const content = this.export(skeleton, clip);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
