import * as YUKA from 'yuka';
import { _max_pursuer_health_points_ } from '../etc/constant';

export default class Pursuer extends YUKA.Vehicle {
  constructor(world) {
    super();
    this.maxSpeed = 2;
    this.world = world;

    this.boundingRadius = 0.5;
    this.healthPoints = _max_pursuer_health_points_;

    this.boundingSphere = new YUKA.BoundingSphere();
    this.boundingSphere.radius = this.boundingRadius;

    this.stateMachineMovement = new YUKA.StateMachine(this);
    this.stateMachineCombat = new YUKA.StateMachine(this);

    this.audioMaps = new Map();
  }

  setCombatPattern(pattern) {
    this.stateMachineCombat.currentState = pattern;
    this.stateMachineCombat.currentState.enter(this);
    return this;
  }
}
