import Card from './Card.js';

export default class Deck{
    constructor(){
        this.cards = init();
        this.index = 0;
    }
    /**
     * 洗牌
     */
    shuffle(){
        const cards = this.cards;
        // 随机获取一副牌
        for(let i = cards.length - 1;i > 0;i-- ){
            const newIndex = Math.floor(Math.random() * ( i + 1));// (5 + 1)
            const oldValue = this.cards[newIndex];

            this.cards[newIndex] = this.cards[i];
            this.cards[i] = oldValue;
        }

        this.index = 0;
        return this;
    }
    /**
     * 下一张卡牌
     */
    nextCard(){
        const cards = this.cards[this.index ++];
        return cards;
    }
}

const SUITS = ['♣', '♠', '♥', '♦'];// (扑克牌中)所有同花色的牌
const TYPES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];// 1-13

function init(){
        //  4类 梅花，桃，心、方块 * 没类型牌有13张 * 6 副牌
    	// 4 (suits) * 13 (card types) * 6 (decks) = 312 cards
    const decks =[];
    for(let i =0; i < 6;i++){
        const deck = SUITS.flatMap(suit=>{
            return TYPES.map(type=>{
                return new Card(suit,type);
            });
        });
        decks.push(deck);
    }
    
    return decks.flat();
}