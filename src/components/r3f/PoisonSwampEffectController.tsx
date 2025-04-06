import React, { useEffect, useState } from 'react'
import * as THREE from 'three'
import { useRapier } from '@react-three/rapier'
import { Ray } from '@dimforge/rapier3d-compat'
import { PoisonSwamp } from './PoisonSwamp'

interface PoisonCloudEffectControllerProps {
  targetPosition: THREE.Vector3
  onComplete: () => void
  duration?: number
}

export const PoisonSwampEffectController: React.FC<PoisonCloudEffectControllerProps> = ({
  targetPosition,
  onComplete,
  duration = 3000,
}) => {
  const { world } = useRapier()
  const [finalPos, setFinalPos] = useState<THREE.Vector3 | null>(null)
  const [isCalc, setIsCalc] = useState(true)

  useEffect(() => {
    // (1) Raycast로 바닥 높이 찾기
    const origin = targetPosition.clone().add(new THREE.Vector3(0, 10, 0))
    const dir = new THREE.Vector3(0, -1, 0)
    const ray = new Ray(origin, dir)
    const hit = world.castRay(ray, 30, true)

    const groundPos = targetPosition.clone()
    if (hit) {
      const rapierHit = ray.pointAt(hit.timeOfImpact)
      groundPos.set(rapierHit.x, rapierHit.y, rapierHit.z)
    }

    groundPos.y += 0.02
    setFinalPos(groundPos)
    setIsCalc(false)

  }, [targetPosition, world, duration, onComplete])

  if (isCalc || !finalPos) return null

  return (
    <PoisonSwamp
      center={finalPos}
      duration={duration}
      onFinish={() => {
        onComplete()
      }}
    />
  )
}
