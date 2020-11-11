<script>
    let cards = 8
    let data = [
        { id: 1, value: 1, img: '' },
        { id: 2, value: 1, img: '' },
        { id: 3, value: 2, img: '' },
        { id: 4, value: 2, img: '' },
        { id: 5, value: 3, img: '' },
        { id: 6, value: 3, img: '' },
        { id: 7, value: 4, img: '' },
        { id: 8, value: 4, img: '' }
    ]
    let pickedNum, randomNum
    let shuffleData = []

    let selectedCards = []
    let selectedNums = []
    let sum, isOpen
    
    function shuffleCards() {
        for(let i=0; i<cards; i++) {
            randomNum = parseInt(Math.random() * data.length)
            pickedNum = data[randomNum]
            shuffleData = [...shuffleData, pickedNum]
            data.splice(randomNum, 1);
        }
    }

    shuffleCards()
        
    function clickCard(id, value){
        if (selectedCards.length<2) {
            selectedCards = [...selectedCards, value]
            selectedNums = [...selectedNums, id]
        }
        else {
            selectedCards = [value]
            selectedNums = [id]
        }
        checkCard(id)
    }

    function checkCard(id) {
        document.querySelector('.card-item[data-index="'+ id +'"]').classList.add('is-open')
        let flipBack = setTimeout(function(){
            document.querySelector('.card-item[data-index="'+ id +'"]').classList.remove('is-open')
        },500)
        
        if (selectedCards.length==2) {            
            if (selectedCards[0] === selectedCards[1]) {
                console.log('Correct!')
                console.log(selectedNums[0], selectedNums[1])
            }
            else {
                console.log('Not Correct!')
            }
        }
    }

</script>

<div class="container">
    <ul class="card-wrap">
        {#each shuffleData as shuffle, index (shuffle)}
            <li class="card-item"
                class:is-open={ isOpen }
                data-index={ index+1 }
                on:click={() => clickCard(index+1, shuffle.value)}>{ shuffle.value }</li>
        {/each}
    </ul>
</div>

<style lang="scss">
    .container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }
    .card-wrap {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        margin: auto;
        width: 100vw;
        height: 100vh;
    }
    .card-item {
        display: flex;
        justify-content: center;
        align-items: center;
        display: flex;
        width: calc(25% - 5px);
        height: calc(50% - 10px);
        background-color:#222;
        font-size: 0px;
        color: #fff;
        cursor: pointer;
        transition: all 0.35s;
        &:hover {
            font-size: 32px;
            background-color: #333;
        }
        &.is-open {
            background-color: #ddd;
            color: red;
        }
    }
</style>
