import { DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from "three";
import type { Quality } from "@/lib/quality";
import type { SpecimenPart } from "./specimens";

/*
 * Materials for the floating specimens (components/three/specimens.ts), one
 * per part, per tier (DESIGN.md §9.2): clear glass with a bright rim, a glossy
 * liquid coloured per instance, and glossy plastic and metal whose colours
 * are baked into the vertices (the accent part is baked white, so its
 * instance colour shows through). Physical materials with clearcoat on High and
 * Medium, standard ones on Low.
 */

export function specimenMaterial(part: SpecimenPart, level: Quality): Material {
  const low = level === "low";
  switch (part) {
    case "glass":
      return low
        ? new MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.32, roughness: 0.05, side: DoubleSide, depthWrite: false })
        : new MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.24, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.5, envMapIntensity: 1.7, side: DoubleSide, depthWrite: false });
    case "liquid":
      return low ? new MeshStandardMaterial({ transparent: true, opacity: 0.88, roughness: 0.15 }) : new MeshPhysicalMaterial({ transparent: true, opacity: 0.88, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 });
    case "solid":
    case "accent":
      return low ? new MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0 }) : new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 });
  }
}
