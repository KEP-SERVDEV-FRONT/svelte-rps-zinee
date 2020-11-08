<script>
    let n = 8
    let numbers = []
    let addNum

    for(let i=0; i<n; i++) {
        addNum = parseInt(Math.random() * 4) + 1
        numbers = [...numbers, addNum]
        console.log(numbers)
    }
</script>

<div class="container">
    <div class="card-wrap">
        {#each numbers as number}
            <div class="card-item">{ number }</div>
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
        &:hover {
            background-color: #ddd;
        }
    }
</style>
