<div>
	<h1>가위바위보!</h1>

	<h2>{ computer }</h2>
	<h2>{ print }</h2>
	<h2>{ result }</h2>

	<button on:click={() => SEND('가위')}>가위</button>
	<button on:click={() => SEND('바위')}>바위</button>
	<button on:click={() => SEND('보')}>보</button>
</div>

<style>
</style>

<script>
	let num = parseInt(Math.random() * 3)
	let computer = ''
	let print = ''
	let result = ''

	function ACTION() {
		num = parseInt(Math.random() * 3)
		if (num == 0) computer = '가위'
		else if (num == 1) computer = '바위'
		else if (num == 2) computer = '보'
	}

	function SEND(my) {
		clearInterval(timer)
		print = my

	}

	let timer = setInterval(ACTION, 250)
</script>