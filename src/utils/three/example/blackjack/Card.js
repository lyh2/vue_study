
// this mapping is Blackjack specific

const TYPE_VALUE_MAPPING = Object.freeze( {
	'A': 1, // or 11
	'2': 2,
	'3': 3,
	'4': 4,
	'5': 5,
	'6': 6,
	'7': 7,
	'8': 8,
	'9': 9,
	'10': 10,
	'J': 10,
	'Q': 10,
	'K': 10
} );
export default class Card{
    constructor(suit,type){
        this.suit = suit;
        this.type = type;
    }

    getColor(){
        return (this.suit === '♣' || this.suit === '♠') ? 'black' : 'red';
    }
    /**
     * 创建卡牌DIV
     * @returns 
     */
    getMarkup(){
        const cardDiv = document.createElement('div');
        cardDiv.innerText = this.suit;
        cardDiv.classList.add('card',this.getColor());
        cardDiv.dataset.value = `${this.type} ${this.suit}`;
        return cardDiv;
    }
    /**
     * 得到对应的值
     * @returns 
     */
    getValue(){
        return TYPE_VALUE_MAPPING[this.type];
    }
    /**
     * 
     * @returns 判断是会否是 ‘A’
     */
    isAce(){
        return this.type === 'A';
    }
}