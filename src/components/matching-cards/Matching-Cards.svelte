<script>
    let cards = 8
    // let pairs = cards/2
    let numbers = Array.from({length: cards}, (_, i) => i + 1)
    let pickedNum, randomNum
    let shuffleNumbers = []
    
    for(let i=0; i<cards; i++) {
        randomNum = parseInt(Math.random() * numbers.length) + 1
        pickedNum = numbers[randomNum]
        numbers = numbers.filter((n) => { return n != pickedNum })
        if (pickedNum != undefined){
            shuffleNumbers = [...shuffleNumbers, pickedNum]
        }
    }
    
    for(let j=0; j<numbers.length; j++){
        shuffleNumbers.push(numbers[j])
    }
</script>

<div class="container">
    <div class="card-wrap">
        {#each shuffleNumbers as shuffleNumber}
            <div class="card-item">{ shuffleNumber }</div>
        {/each}
    </div>
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
        margin: auto;
        width: 50vw;
        height: 50vh;
    }
    .card-item {
        display: flex;
        justify-content: center;
        align-items: center;
        display: flex;
        width: calc(25% - 5px);
        height: calc(50% - 10px);
        background-color:#222;
        font-size: 20px;
        color: #fff;
        cursor: pointer;
        &:hover {
            background-color: #ddd;
        }
    }
</style>
