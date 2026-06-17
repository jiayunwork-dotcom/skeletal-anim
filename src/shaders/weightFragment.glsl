uniform float opacity;
uniform vec3 color;
uniform bool showWeights;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vWeight;

vec3 weightToColor(float weight) {
  float hue = (1.0 - weight) * 0.66;
  vec3 c = vec3(0.0);
  
  float h = hue * 6.0;
  float x = 1.0 - abs(mod(h, 2.0) - 1.0);
  
  if (h >= 0.0 && h < 1.0) {
    c = vec3(1.0, x, 0.0);
  } else if (h >= 1.0 && h < 2.0) {
    c = vec3(x, 1.0, 0.0);
  } else if (h >= 2.0 && h < 3.0) {
    c = vec3(0.0, 1.0, x);
  } else if (h >= 3.0 && h < 4.0) {
    c = vec3(0.0, x, 1.0);
  } else if (h >= 4.0 && h < 5.0) {
    c = vec3(x, 0.0, 1.0);
  } else {
    c = vec3(1.0, 0.0, x);
  }
  
  return c;
}

void main() {
  vec3 finalColor;
  
  if (showWeights) {
    finalColor = weightToColor(vWeight);
  } else {
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diffuse = max(dot(normalize(vNormal), lightDir), 0.0);
    float ambient = 0.3;
    finalColor = color * (ambient + diffuse * 0.7);
  }
  
  gl_FragColor = vec4(finalColor, opacity);
}
