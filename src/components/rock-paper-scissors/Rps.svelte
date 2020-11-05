<script>
    let life = 5
    let disabled = false
    let num = parseInt(Math.random() * 3)
    let computer = ''
    let com_print = ''
    let my_print = '👀'
    let result = ''
    let username = '지니'

    function ACTION() {
        num = parseInt(Math.random() * 3)
        if (num === 0) {
            computer = '가위'
            com_print = '✌️'
        } else if (num === 1) {
            computer = '바위'
            com_print = '✊'
        } else if (num === 2) {
            computer = '보'
            com_print = '🖐'
        }
    }

    function SEND(my) {
        disabled = true

        clearInterval(timer)

        if (my === '가위') my_print = '✌️'
        else if (my === '바위') my_print = '✊'
        else if (my === '보') my_print = '🖐'

        judgment(my)

        if (life === 0) {
            result = 'GAME OVER'
            disabled = true
        }
    }

    function judgment(my) {
        if (computer === my) {
            result = '비김!'
            life--
        } else if (computer === '가위' && my === '바위') {
            result = username + '승!'
            life++
        } else if (computer === '바위' && my === '보') {
            result = username + '승!'
            life++

        } else if (computer === '보' && my === '가위') {
            result = username + '승!'
            life++
        } else if (computer === '가위' && my === '보') {
            result = username + '패!'
            life--
        } else if (computer === '바위' && my === '가위') {
            result = username + '패!'
            life--
        } else if (computer === '보' && my === '바위') {
            result = username + '패!'
            life--
        }
    }

    function retry() {
        disabled = false
        result = ''
        my_print = '👀'
        timer = setInterval(ACTION, 100)
    }

    let timer = setInterval(ACTION, 100)
</script>

<div class="wrapper">
	<h1 class="game-title">가위바위보<span>남은 목숨 : { life }</span></h1>

	{#if result}
		<div class="result">
			{#if life > 0}
				<p class="txt">{ result }</p>
				<button class="btn-retry" on:click="{() => retry()}">한 번 더!</button>
			{:else}
				<p class="txt error">{ result }</p>
			{/if}
		</div>
	{/if}

	<div class="inner">
		<div class="com loser">
			<h2>{ com_print }</h2>
		</div>
		<div class="me winner">
			<h2>{ my_print }</h2>
			<div class="btn-area">
				<button on:click={() => SEND('가위')} { disabled }>✌️</button>
				<button on:click={() => SEND('바위')} { disabled }>✊</button>
				<button on:click={() => SEND('보')} { disabled }>🖐</button>
			</div>
		</div>
	</div>
</div>

<style>
    .inner {
        display: flex;
        width: 100%;
        height: 100vh;
    }

    .inner .com {
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;
    }

    .inner .me {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex: 1;
    }

    .inner .me .btn-area {
        position: absolute;
        bottom: 10vh;
        left: 0;
        right: 0;
        text-align: center;
    }

    .game-title {
        position: fixed;
        top: 10vh;
        left: 0;
        right: 0;
        padding: 10px;
        font-size: 2em;
        text-align: center;
        z-index: 1;
    }

    .game-title span {
        display: block;
        font-size: 14px;
        font-weight: 400;
    }

    .result {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        background: rgba(0, 0, 0, 0.1);
        z-index: 10;
    }

    .result .txt {
        padding-top: 40vh;
        font-size: 10em;
        font-weight: 700;
        text-align: center;
    }

    .result .txt.error {
        color: red;
        text-shadow: 3px 3px 7px rgba(0, 0, 0, 0.3);
    }

    .result .btn-retry {
        padding: 1em 0;
        font-size: 2em;
        font-weight: 500;
        background: #fff;
    }

    .result .btn-retry:hover {
        background: #ddd;
    }

    .loser {
        background: rgba(255, 0, 0, 0.1);
    }

    .winner {
        background: rgba(255, 255, 0, 0.1);
    }

    h2 {
        font-size: 10em;
    }

    button {
        font-size: 5em;
    }
</style>
