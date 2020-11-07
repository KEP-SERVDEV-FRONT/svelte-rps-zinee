<div class="container">
    <div class="card-wrap">
        <div class="card-item">{{ n }}</div>
        <div class="card-item">{{ n }}</div>
        <div class="card-item">{{ n }}</div>
        <div class="card-item">{{ n }}</div>
        <div class="card-item">{{ n }}</div>
        <div class="card-item">{{ n }}</div>
        <div class="card-item">{{ n }}</div>
        <div class="card-item">{{ n }}</div>
    </div>
</div>

<script>
    let n = 0;

</script>

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
        width: 400px;
        height: 200px;
    }
    .card-item {
        display: block;
        width: calc(25% -5px);
        height: calc(50% - 10px);
        background-color:#222;
    }
</style>
