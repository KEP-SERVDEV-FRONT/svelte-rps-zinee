<script>
    let data = [
        { value: 1, img: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/IU_MelOn_Music_Awards_2017_06.jpg' },
        { value: 1, img: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/IU_MelOn_Music_Awards_2017_06.jpg' },
        { value: 2, img: 'https://image.bugsm.co.kr/artist/images/1000/800491/80049126.jpg' },
        { value: 2, img: 'https://image.bugsm.co.kr/artist/images/1000/800491/80049126.jpg' },
        { value: 3, img: 'https://image.news1.kr/system/photos/2020/2/18/4059225/article.jpg/dims/optimize' },
        { value: 3, img: 'https://image.news1.kr/system/photos/2020/2/18/4059225/article.jpg/dims/optimize' },
        { value: 4, img: 'https://dimg.donga.com/wps/NEWS/IMAGE/2019/12/31/99024137.2.jpg' },
        { value: 4, img: 'https://dimg.donga.com/wps/NEWS/IMAGE/2019/12/31/99024137.2.jpg' },
        { value: 5, img: 'https://i.pinimg.com/originals/79/45/8f/79458f79fcdf5d9345a86faf430c2091.jpg' },
        { value: 5, img: 'https://i.pinimg.com/originals/79/45/8f/79458f79fcdf5d9345a86faf430c2091.jpg' },
        { value: 6, img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTctk0e9mHVkoma-l50iIqnlVCGyOmW2LaXEA&usqp=CAU' },
        { value: 6, img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTctk0e9mHVkoma-l50iIqnlVCGyOmW2LaXEA&usqp=CAU' }
    ]
    let cards = data.length
    let pickedNum, randomNum
    let shuffleData = []

    let selectedCards = []
    let selectedNums = []
    let sum, isOpen

    shuffleCards()

    function shuffleCards() {
        for(let i=0; i<cards; i++) {
            randomNum = parseInt(Math.random() * data.length)
            pickedNum = data[randomNum]
            shuffleData = [...shuffleData, pickedNum]
            data.splice(randomNum, 1);
        }
    }
        
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
        if (selectedCards.length==2) {            
            if (selectedCards[0] === selectedCards[1]) {
                console.log('Correct!')
                document.querySelector('.card-item[data-index="'+ selectedNums[0] +'"]').classList.add('is-open')
                document.querySelector('.card-item[data-index="'+ selectedNums[1] +'"]').classList.add('is-open')
                console.log(selectedNums[0], selectedNums[1])
            }
            else {
                console.log('Not Correct!')
            }
        }
    }
</script>

<div class="container">
    <h1>아이유를 찾아라</h1>
    <ul class="card-wrap">
        {#each shuffleData as shuffle, index (shuffle)}
            <li class="card-item"
                class:is-open={ isOpen }
                style="background-image: url('{ shuffle.img }')"
                data-index={ index+1 }
                on:click={() => clickCard(index+1, shuffle.value)}>{ shuffle.value }</li>
        {/each}
    </ul>
</div>

<style lang="scss">
    h1 {
        margin-top: auto;
        font-size: 50px;
        color: #ddd;
        text-align: center;
    }
    .container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: #000;
    }
    .card-wrap {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        margin: auto;
        width: 100vw;
        height: 80vh;
    }
    .card-item {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        display: flex;
        margin: 10px;
        width: calc(100% / 6 - 20px);
        height: 50%;
        background-color:#222;
        background-repeat: no-repeat;
        background-size: cover;
        background-position: center;
        font-size: 0px;
        color: #fff;
        cursor: pointer;
        transition: all 0.35s;
        &::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            display: block;
            width: 100%;
            height: 100%;
            background-color: #222;
            transition: all 0.35s;
        }
        &:hover {
            &::after {
                opacity: 0;
            }
        }
        &.is-open {
            &::after {
                opacity: 0;
            }
        }
    }
</style>
