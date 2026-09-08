let lockCount = 0;

export function lockBodyScroll() {
  if (lockCount === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
  }
  lockCount += 1;
}

export function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.paddingRight = '';
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
  }
}