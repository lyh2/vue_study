export default class Player{
    constructor(){
        this.cards = [];
    }
    /**
     * 添加卡片
     * @param {*} card 
     */
    addCard(card){
        this.cards .push(card);
    }
    /**
     * 
     * @returns 获取卡片
     */
    getCards(){
        return [... this.cards];
    }
    /**
     * 获取和
     * @returns 
     */
    getSum(){
        const cards = this.cards;
        let sum = 0;
        let hasAce = false;
        for(const card of cards){
            sum += card.getValue();
            if(card.isAce()) hasAce = true;
        }

        const usableAce = hasAce && sum + 10 <= 21;
        return usableAce ? sum + 10 : sum;
    }
    /**
     * 
     * @returns 
     */
    hasUsableAce(){
        let hasAce = false;
        for(const card of this.cards){
            if(card.isAce()) hasAce = true;
        }

        return hasAce && this.getSum() + 10 <= 21;
    }
    /**
     * 
     * @returns 
     */
    isBust(){
        return this.getSum() > 21;
    }

    reset(){
        this.cards.length = 0;
    }
}