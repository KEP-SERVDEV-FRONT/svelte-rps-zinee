<div class="wrapper">
	<h1 class="game-title">가위바위보</h1>
	<h2 class="result">{ result }</h2>
	<div class="inner">
		<div class="com loser">
			<h2>{ computer }</h2>
		</div>
		<div class="me winner">
			<h2>{ print }</h2>
			<div class="btn-area"> 
				<button on:click={() => SEND('가위')}>✌️</button>
				<button on:click={() => SEND('바위')}>✊</button>
				<button on:click={() => SEND('보')}>🖐</button>
			</div>
		</div>
	</div>
</div>

<style>
	.inner { display: flex; width: 100%; height: 100vh; }
	.inner .com { display: flex; justify-content: center; align-items: center; flex: 1; }
	.inner .me { position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; flex: 1; }
	.inner .me .btn-area { position: absolute; bottom: 10vh; left: 0; right: 0; text-align: center; }
	.game-title { position: fixed; top: 10vh; left: 0; right: 0; padding: 10px; background: rgba(255,255,255,0.1); font-size: 2em; text-align: center; z-index: 1; }
	.result { position: fixed; top: 10vh; left: 0; right: 0; font-size: 20em; text-align: center; }
	.loser { background: rgba(255,0,0,0.1); }
	.winner { background: rgba(255,255,0,0.1); }
	h2 { font-size: 10em; }
	button { font-size: 5em; }
</style>

<script>
	let num = parseInt(Math.random() * 3)
	let computer = ''
	let print = '👀'
	let result = ''

	function ACTION() {
		num = parseInt(Math.random() * 3)
		if (num == 0) computer = '✌️'
		else if (num == 1) computer = '✊'
		else if (num == 2) computer = '🖐'
	}

	function SEND(my) {
		clearInterval(timer)

		if (my=='가위') print = '✌️'
		else if (my == '바위') print = '✊'
		else if (my == '보') print = '🖐'
	}

	let timer = setInterval(ACTION, 250)
</script>