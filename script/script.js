gsap.registerPlugin(ScrollTrigger);


window.addEventListener('load', () => ScrollTrigger.refresh());
const track = document.querySelector('.card-container');
const distance = () => track.scrollWidth - window.innerWidth;

const tl = gsap.timeline({
    scrollTrigger: {
        trigger: '.horizontal-section',
        pin: true,
        scrub: 1,
        end: () => `+=${distance()}`,
        invalidateOnRefresh: true
    }
});

tl.to({}, { duration: 2 });
tl.to(track, {
    x: () => -distance(),
    ease: 'none',
    duration: 2,
});

gsap.to('.overlay-holder', {
    marginTop: '-60vh',
    ease: 'power3.in',
    scrollTrigger: {
        trigger: '.portfolio-showcase-underlay',
        start: 'top 50%',
        end: 'top 10%',
        scrub: 0.5,

    }
});








gsap.from(".after-hero-h2 .line", {
    opacity: 0,
    y: 30,
    stagger: 0.15,
    scrollTrigger: {
        trigger: ".after-hero-h2",
        start: "top 50%",
        end: "top 30%",
        scrub: 1
    }
});

gsap.from('.experiences-h1', {
    scale: .5,
    opacity: 0,
    y: 100,
    filter: 'blur(100px)',
    scrollTrigger: {
        trigger: '.experiences',
        start: 'top 100%',
        end: 'top 0%',
        scrub: 1
    }
});

gsap.from('.career-archive', {
    opacity: 0,
    y: "+=5",
    scrollTrigger: {
        trigger: '.experiences',
        start: 'bottom bottom',
        end: 'bottom 90%',
        scrub: 1
    }
});

const boxes = document.querySelectorAll('.card');

gsap.from('.card', {
    opacity: 0,
    scale: 0.9,
    stagger: 0.5,
    ease: 'power4.in',
    scrollTrigger: {
        trigger: '.horizontal-section',
        start: 'top 90%',
        end: 'top 10%',
        scrub: 3,
    }
});



// 1. Initialize Lenis Smooth Scroll
const lenis = new Lenis({
    duration: 2, // Scroll ease length in seconds (higher = smoother & slower)
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential ease-out curve
    smoothWheel: true
});

// 2. Sync Lenis scroll updates with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);

// 3. Drive Lenis through GSAP's internal ticker (frame update loop)
gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});

// 4. Disable GSAP lag smoothing to ensure pinned sections don't jump
gsap.ticker.lagSmoothing(0);











async function getContributions() {
    const myContribution = await fetch('https://github-contributions-api.jogruber.de/v4/faideleon');
    const data = await myContribution.json();

    showContributions(data.contributions);

    const totalContributions = data.total['2026'];

    const activeDaysArray = data.contributions.filter(day => day.count > 0);
    const totalActive = activeDaysArray.length;

    const date = document.querySelector('.date h3');
    const activeHeading = document.querySelector('.active h3');
    const streakHeading = document.querySelector('.streak h3');
    const streakSpan = document.querySelector('.streak-info span', '.streak')

    if (date) {
        date.innerHTML = totalContributions;
    }

    if (activeHeading) {
        activeHeading.innerHTML = `${totalActive} `
    }
    let streakNumber = getStreak(data.contributions);

    if (streakHeading && streakSpan) {
        streakHeading.innerHTML = `${streakNumber}`;
        streakSpan.innerHTML = `${streakNumber === 1 ? 'day' : 'days'}`
    }

}

function getStreak(gitData) {
    const data = gitData;

    let currentStreak = 0;
    let maxStreak = 0;

    for (let i = 0; i < data.length; i++) {
        if (data[i].count > 0) {
            currentStreak++;
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
            }
        }
        else {
            currentStreak = 0;
        }

    }
    return maxStreak;
}

function showContributions(gitData) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const container = document.querySelector('.graph-content');
    const dayContainer = document.querySelector('.content-weekday-labels');


    for (let weekday = 1; weekday < 7; weekday += 2) {
        const dayDate = new Date(gitData[weekday].date);
        const element = document.createElement('span');
        element.innerHTML = days[dayDate.getDay()];
        element.classList.add('dayDate');
        element.style.gridRowStart = weekday + 1;
        dayContainer.append(element);
    }


    gitData.forEach(day => {
        const element = document.createElement('div');
        element.classList.add('day');
        element.innerHTML = `<div class='day-box'></div>`;

        if (day.count > 0) {
            if (day.count >= 4) {
                element.classList.add('fifth-color');
            }
            if (day.count === 3) {
                element.classList.add('fourth-color');
            }
            if (day.count === 2) {
                element.classList.add('third-color');
            }
            if (day.count === 1) {
                element.classList.add('second-color');
            }
        } else {
            element.classList.add('first-color');
        }


        container.append(element);
    });
    hoverContributions(gitData);
    calendarMonths(gitData);

}

function hoverContributions(gitData) {

    const containerHover = document.querySelectorAll('.day');
    const main_container = document.querySelector('.graph-content');


    for (let i = 0; i < containerHover.length; i++) {

        containerHover[i].addEventListener('mouseenter', () => {
            containerHover[i].style.position = 'relative';
            const element = document.createElement('div');
            element.classList.add('tooltip');
            element.innerHTML = `<h2>${gitData[i].count} contributions</h2><h5>${gitData[i].date}</h5>`;

            containerHover[i].append(element);
        });

        containerHover[i].addEventListener('mouseleave', () => {
            const element = document.querySelector('.tooltip');
            if (element) {
                element.remove();
            }

        });
    }
}


function calendarMonths(gitArray) {
    const graph_months = document.querySelector('.graph-months');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let lastMonth = -1;

    gitArray.forEach((day, index) => {
        const date = new Date(day.date);
        const month = date.getMonth();
        const columnDay = Math.floor(index / 7);
        if (lastMonth != month) {
            lastMonth = month;
            element = document.createElement('span');
            element.innerHTML = months[month];
            element.classList.add('month-label');
            element.style.gridColumnStart = columnDay + 1;

            graph_months.append(element);
        }



    });
}



getContributions();