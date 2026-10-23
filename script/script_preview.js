// MANUAL IMAGE PREVIEW ON PROJECT CARDS
// cards are links, so the controls stop the click from opening the project
document.querySelectorAll('.preview-slider').forEach((slider) => {
    const track = slider.querySelector('.slider-track');
    const slides = slider.querySelectorAll('.slider-track > *');
    const dots = slider.querySelectorAll('.slider-dots button');
    const count = slider.querySelector('.slider-count');
    const prevButton = slider.querySelector('.slider-prev');
    const nextButton = slider.querySelector('.slider-next');

    let current = 0;

    function pad(number) {
        return String(number).padStart(2, '0');
    }

    function showSlide(index) {
        current = (index + slides.length) % slides.length;
        track.style.transform = `translateX(${-100 * current}%)`;
        count.innerHTML = `${pad(current + 1)} / ${pad(slides.length)}`;

        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === current);
        });
    }

    function onControl(button, getIndex) {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSlide(getIndex());
        });
    }

    onControl(prevButton, () => current - 1);
    onControl(nextButton, () => current + 1);
    dots.forEach((dot, i) => onControl(dot, () => i));

    showSlide(0);
});
