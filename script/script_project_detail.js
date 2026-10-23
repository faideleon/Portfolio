gsap.registerPlugin(ScrollTrigger);


window.addEventListener('load', () => ScrollTrigger.refresh());



// GALLERY
const galleryTrack = document.querySelector('.gallery-track');
const gallerySlides = document.querySelectorAll('.gallery-track > *');
const galleryDots = document.querySelectorAll('.gallery-dots button');
const galleryCount = document.querySelector('.gallery-count');
const captionTitle = document.querySelector('.caption-title');
const captionDesc = document.querySelector('.caption-desc');
const prevButton = document.querySelector('.gallery-prev');
const nextButton = document.querySelector('.gallery-next');

let currentSlide = 0;

function pad(number) {
    return String(number).padStart(2, '0');
}

function showSlide(index) {
    currentSlide = (index + gallerySlides.length) % gallerySlides.length;
    const slide = gallerySlides[currentSlide];

    gsap.to(galleryTrack, {
        xPercent: -100 * currentSlide,
        duration: 0.7,
        ease: 'power3.inOut'
    });
    galleryCount.innerHTML = `${pad(currentSlide + 1)} / ${pad(gallerySlides.length)}`;
    captionTitle.innerHTML = slide.dataset.title;
    captionDesc.innerHTML = slide.dataset.caption;

    galleryDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
    });
}

if (galleryTrack) {
    showSlide(0);

    galleryDots.forEach((dot, i) => {
        dot.addEventListener('click', () => showSlide(i));
    });

    if (prevButton && nextButton) {
        prevButton.addEventListener('click', () => showSlide(currentSlide - 1));
        nextButton.addEventListener('click', () => showSlide(currentSlide + 1));
    }

    // arrow keys
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') showSlide(currentSlide - 1);
        if (e.key === 'ArrowRight') showSlide(currentSlide + 1);
    });

    // swipe / drag
    const galleryFrame = document.querySelector('.gallery-frame');
    let dragStart = null;

    galleryFrame.addEventListener('pointerdown', (e) => {
        dragStart = e.clientX;
    });

    window.addEventListener('pointerup', (e) => {
        if (dragStart === null) return;
        const distance = e.clientX - dragStart;
        dragStart = null;

        if (distance > 50) showSlide(currentSlide - 1);
        if (distance < -50) showSlide(currentSlide + 1);
    });
}



// COUNT UP THE IMPACT NUMBERS
document.querySelectorAll('.impact-stats h3').forEach((stat) => {
    const match = stat.textContent.match(/^(\D*)(\d+)(.*)$/);
    if (!match) return;

    const [, prefix, number, suffix] = match;
    const counter = { value: 0 };

    gsap.to(counter, {
        value: Number(number),
        duration: 1.6,
        ease: 'power2.out',
        onUpdate: () => {
            stat.textContent = `${prefix}${Math.round(counter.value)}${suffix}`;
        },
        scrollTrigger: {
            trigger: stat,
            start: 'top 90%',
            once: true
        }
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



gsap.from('.project-header .header-left > *, .project-header .header-right', {
    opacity: 0,
    y: 30,
    stagger: 0.1,
    duration: 0.8,
    ease: 'power3.out'
});

gsap.from('.gallery-frame', {
    opacity: 0,
    y: 60,
    duration: 1,
    delay: 0.3,
    ease: 'power3.out'
});

gsap.fromTo('.gallery-frame', {
    scale: 0.94
}, {
    scale: 1,
    ease: 'none',
    scrollTrigger: {
        trigger: '.gallery-frame',
        start: 'top bottom',
        end: 'center center',
        scrub: 1
    }
});

gsap.from('.contribution-list li', {
    opacity: 0,
    y: 20,
    stagger: 0.1,
    scrollTrigger: {
        trigger: '.story-content',
        start: 'top 85%',
        end: 'top 45%',
        scrub: 1
    }
});

gsap.from('.impact-card', {
    opacity: 0,
    y: 40,
    scrollTrigger: {
        trigger: '.story-content',
        start: 'top 85%',
        end: 'top 50%',
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
