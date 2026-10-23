gsap.registerPlugin(ScrollTrigger);


window.addEventListener('load', () => ScrollTrigger.refresh());



// FILTER BY DISCIPLINE
const filterButtons = document.querySelectorAll('.filter-button');
const projectCards = document.querySelectorAll('.project-card');
const filterCount = document.querySelector('.filter-count');

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        let shown = 0;

        filterButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');

        projectCards.forEach((card) => {
            if (filter === 'all' || card.dataset.discipline === filter) {
                card.classList.remove('hidden');
                shown++;
            } else {
                card.classList.add('hidden');
            }
        });

        filterCount.innerHTML = `Showing ${String(shown).padStart(2, '0')} ${shown === 1 ? 'project' : 'projects'}`;
        ScrollTrigger.refresh();
    });
});



// FADE BETWEEN PAGES
document.querySelectorAll('a[href$=".html"]').forEach((link) => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.add('page-leaving');
        setTimeout(() => {
            window.location.href = link.href;
        }, 300);
    });
});

window.addEventListener('pageshow', () => document.body.classList.remove('page-leaving'));



gsap.from('.projects-hero > *:not(.watermark)', {
    opacity: 0,
    y: 30,
    stagger: 0.1,
    duration: 0.8,
    ease: 'power3.out'
});

gsap.from('.project-card', {
    opacity: 0,
    y: 50,
    stagger: 0.15,
    scrollTrigger: {
        trigger: '.projects-grid',
        start: 'top 90%',
        end: 'top 40%',
        scrub: 1
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

// 4. Disable GSAP lag smoothing
gsap.ticker.lagSmoothing(0);
