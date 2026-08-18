import * as ecs from '@8thwall/ecs'
import {OBJECT_PLACED_EVENT} from './tap-to-place'

// 바닥 인식 표시기.
// 화면 중앙에서 바닥(y=0 평면)으로 레이를 쏴 그 지점에 링을 놓는다.
// 배치 전에는 계속 따라다니고, 배치되면 숨는다. 리셋하면 다시 나온다.
//
// 주의: onTick 안에서 예외가 나면 ECS 업데이트 루프 전체가 멈춰 화면이 백지가 된다.
// 그래서 본문 전체를 try/catch 로 감싸고, 실패하면 이 컴포넌트만 조용히 죽는다.
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
    let dead = false      // 한 번이라도 실패하면 이후 동작을 멈춘다
    let shown = true      // hide/show 를 매 프레임 호출하지 않기 위한 상태 기억

    const setShown = (v: boolean) => {
      if (v === shown) {
        return
      }
      shown = v
      if (v) {
        entity.show()
      } else {
        entity.hide()
      }
    }

    const follow = () => {
      if (dead) {
        return
      }
      try {
        const camEid = world.camera.getActiveEid()
        if (camEid === undefined || camEid === null) {
          return
        }

        const c = world.transform.getWorldPosition(camEid)
        const q = world.transform.getWorldQuaternion(camEid)
        if (!c || !q) {
          return
        }

        // 카메라 정면 = 쿼터니언으로 회전시킨 (0, 0, -1)
        const fx = -2 * (q.w * q.y + q.x * q.z)
        const fy = 2 * (q.w * q.x - q.y * q.z)
        const fz = 2 * (q.x * q.x + q.y * q.y) - 1

        if (fy > -0.05) {        // 위를 보고 있으면 바닥과 안 만난다
          setShown(false)
          return
        }

        const cfg = schemaAttribute.get(eid)
        const maxD = (cfg && cfg.maxDistance) || 8
        const minD = (cfg && cfg.minDistance) || 0.4

        const t = -c.y / fy
        if (!isFinite(t) || t < minD || t > maxD) {
          setShown(false)
          return
        }

        setShown(true)
        entity.setLocalPosition({
          x: c.x + fx * t,
          y: 0.012,            // z-fighting 방지용으로 바닥에서 살짝 띄움
          z: c.z + fz * t,
        })
      } catch (err) {
        dead = true
        try {
          entity.hide()
        } catch (e) { /* noop */ }
      }
    }

    defineState('searching')
      .initial()
      .onTick(follow)
      .onEvent(OBJECT_PLACED_EVENT, 'placed', {target: world.events.globalId})

    defineState('placed')
      .onEnter(() => {
        shown = true
        setShown(false)
      })
      // 리셋 버튼이 건물을 지우면 다시 탐색 상태로 돌아간다
      .onEvent(ecs.input.UI_CLICK, 'searching', {target: world.events.globalId})
  },
})
