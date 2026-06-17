#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

uniform mat4 bindMatrices[100];
uniform mat4 boneMatrices[100];

varying vec3 vNormal;
varying vec3 vPosition;
varying float vWeight;

void main() {
  #include <uv_vertex>
  #include <uv2_vertex>
  #include <color_vertex>
  #include <morphcolor_vertex>

  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>

  vNormal = normalize(transformedNormal);

  #include <begin_vertex>
  #include <morphtarget_vertex>

  vec4 skinVertex = vec4(position, 1.0);
  vec4 transformedPosition = vec4(0.0);
  float totalWeight = 0.0;

  for (int i = 0; i < 4; i++) {
    float weight = skinWeights[i];
    if (weight > 0.0) {
      int boneIndex = int(skinIndices[i]);
      mat4 boneMatrix = boneMatrices[boneIndex];
      mat4 bindMatrix = bindMatrices[boneIndex];
      mat4 skinMatrix = boneMatrix * bindMatrix;
      transformedPosition += skinMatrix * skinVertex * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight > 0.0) {
    transformed = transformedPosition.xyz;
  }

  vWeight = skinWeights[0];
  vPosition = transformed;

  #include <displacementmap_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  #include <fog_vertex>
  #include <shadowmap_vertex>
}
