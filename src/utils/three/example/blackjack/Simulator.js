import * as YUKA from 'yuka';

export default class Simulator{
    constructor(env,episodes){
        this.env = env;
        this.episodes = episodes;

        this.alpha = 0.001;

        this.epsilon = 1;
        this.minEpsilon = 0.01;
        this.decay = 0.9999;

    }

    predict(){
        const env = this.env;
        const Q = {};
        init(Q,env);
        for(let i =0; i < this.episodes;i++){
            this.episodes = Math.max(this.epsilon * this.decay,this.minEpsilon);
            const episode = playEpisode(env,Q,this.epsilon);
            updateQ(env,episode,Q,this.alpha);
        }

        return getBestPolicy(Q);
    }
}
function getBestPolicy(Q){
    const policy ={};
    for(const key in Q){
        const actionValues = Q[key];
        const bestAction = YUKA.MathUtils.argmax(actionValues)[0];
        policy[key] = bestAction;
    }
    return policy;
}
function updateQ(env,episode,Q,alpha){
    let G = 0;
    for(let t = episode.length - 1 ; t >= 0;t--){
        const {state,action,reward} = episode[t];
        const key = getKey(state);
        G += reward;
        Q[key][action] += alpha * (G - Q[key][action]);
    }
}
function playEpisode(env,Q,epsilon){
    const episode = [];
    const actionSpace = env.actionSpace;
    const nA = actionSpace.length;
    let currentState = env.reset();

    while(true){
        const probabilities = getProbabilities(Q,currentState,epsilon,nA);
        const action = YUKA.MathUtils.choice(actionSpace,probabilities);
        const {state,reward,done} = env.step(action);
        episode.push({state:currentState,action,reward});
        currentState = state;
        if(done) break;
    }

    return episode;
}

function getKey(state){
    return state[0] + '-'+state[1]+'-'+Number(state[2]);
}

function getProbabilities(Q,state,epsilon,nA){
    const key = getKey(state);
    const actionValues = Q[key];
    const probabilities = actionValues.map(()=>epsilon / nA);
    const bestAction = YUKA.MathUtils.argmax(actionValues)[0];
    probabilities[bestAction] = 1 - epsilon + (epsilon / nA);
    return probabilities;
}

function init(Q,env){
    const actionSpace = env.actionSpace;
    const observationSpace = env.observationSpace;
    for(let i = 0; i < observationSpace.length;i++){
        const state = observationSpace[i];
        Q[state] = actionSpace.map(()=>0);
    }
}