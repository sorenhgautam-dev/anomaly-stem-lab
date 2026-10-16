import { AdditiveBlending, Color, DoubleSide, FrontSide, NormalBlending, ShaderMaterial, UniformsLib, UniformsUtils, type IUniform } from "three";

/*
 * Helpers for the room's custom shaders: every one gets fog and the
 * renderer's tone mapping and colour space, so it sits in the same light as
 * the PBR materials whether or not post-processing is on.
 */

export const FOG_VERTEX_PARS = /* glsl */ `#include <fog_pars_vertex>`;
export const FOG_FRAGMENT_PARS = /* glsl */ `#include <fog_pars_fragment>`;
/** Needs `vec4 mvPosition` in scope. */
export const FOG_VERTEX = /* glsl */ `#include <fog_vertex>`;
export const FINISH = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
`;

/** Rounded-rectangle signed distance in [-1, 1] uv space (negative inside). */
export const SDF = /* glsl */ `
  float roundRect(vec2 p, vec2 size, float r) {
    vec2 q = abs(p) - size + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float hash(float n) { return fract(sin(n) * 43758.5453); }
`;

export interface RoomShaderOptions {
  vertexShader: string;
  fragmentShader: string;
  uniforms?: Record<string, IUniform>;
  transparent?: boolean;
  additive?: boolean;
  depthWrite?: boolean;
  doubleSided?: boolean;
}

export function roomShader(o: RoomShaderOptions): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: o.vertexShader,
    fragmentShader: o.fragmentShader,
    uniforms: UniformsUtils.merge([UniformsLib.fog, { uTime: { value: 0 } }, o.uniforms ?? {}]),
    fog: true,
    transparent: o.transparent ?? o.additive ?? false,
    depthWrite: o.depthWrite ?? !(o.additive ?? false),
    blending: o.additive ? AdditiveBlending : NormalBlending,
    side: o.doubleSided ? DoubleSide : FrontSide,
  });
}

/** A colour uniform from a hex token, in linear space like three's own colours. */
export function colour(hex: string, scale = 1): IUniform<Color> {
  return { value: new Color(hex).multiplyScalar(scale) };
}
