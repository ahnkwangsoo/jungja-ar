import * as ecs from '@8thwall/ecs'
import {OBJECT_PLACED_EVENT} from './tap-to-place'

// 바닥 인식 표시기.
// 화면 중앙에서 바닥(y=0 평면)으로 레이를 쏴 그 지점에 링을 놓는다.
// 배치 전에는 계속 따라다니고, 배치되면 숨는다. 리셋하면 다시 나온다.
ecs.registerComponent({
  name: 'floor-reticle',
  schema: {
    maxDistance: 'f32',   // 이보다 멀면 표시하지 않음 (m)
    minDistance: 'f32',
  },
  schemaDefaults: {
    maxDistance: 8,
    minDistance: 0.4,
  },
  stateMachine: ({world, eid, entity, schemaAttribute, defineState}) => {
    const camPos = ecs.math.vec3.zero()
    const camRot = {x: 0, y: 0, z: 0, w: 1}

    const follow = () => {
      const cfg = schemaAttribute.get(eid)
      let camEid
      try {
        camEid = world.camera.getActiveEid()
      } catch (err) {
        return
      }
      if (camEid === undefined || camEid === null) {
        return
      }

      world.transform.getWorldPosition(camEid, camPos)
      const q = world.transform.getWorldQuaternion(camEid, camRot as any)
      const x = q.x
      const y = q.y
      const z = q.z
      const w = q.w

      // 카메라 정면 = 쿼터니언으로 회전시킨 (0, 0, -1)
      const fx = -2 * (w * y + x * z)
      const fy = 2 * (w * x - y * z)
      const fz = 2 * (x * x + y * y) - 1

      // 아래를 향하고 있어야 바닥과 만난다
      if (fy > -0.05) {
        entity.hide()
        return
      }

      const t = -camPos.y / fy
      if (t < cfg.minDistance || t > cfg.maxDistance) {
        entity.hide()
        return
      }

      entity.show()
      entity.setLocalPosition({
        x: camPos.x + fx * t,
        y: 0.012,          // z-fighting 방지용으로 바닥에서 살짝 띄움
        z: camPos.z + fz * t,
      })
    }

    defineState('searching')
      .initial()
      .onTick(follow)
      .onEvent(OBJECT_PLACED_EVENT, 'placed', {target: world.events.globalId})

    defineState('placed')
      .onEnter(() => entity.hide())
      .onExit(() => entity.show())
      // 리셋 버튼이 건물을 지우면 다시 탐색 상태로 돌아간다
      .onEvent(ecs.input.UI_CLICK, 'searching', {target: world.events.globalId})
  },
})
