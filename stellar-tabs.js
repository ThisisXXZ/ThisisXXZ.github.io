/* Generated from Stellar 1.29.1 (MIT). See src/vendor/stellar/LICENSE. Run npm run widgets:build; do not edit. */
(() => {
  // Binding `nav-tabs` & `tab-content` by real time permalink changing.
  document.querySelectorAll('.tabs .nav-tabs .tab').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      // Prevent selected tab to select again.
      if (element.classList.contains('active')) return;
      // Add & Remove active class on `nav-tabs` & `tab-content`.
      [...element.parentNode.children].forEach((target) => {
        target.classList.toggle('active', target === element);
      });
      // https://stackoverflow.com/questions/20306204/using-queryselector-with-ids-that-are-numbers
      const tActive = document.getElementById(
        element.querySelector('a').getAttribute('href').replace('#', '')
      );
      [...tActive.parentNode.children].forEach((target) => {
        target.classList.toggle('active', target === tActive);
      });
      // Trigger event
      tActive.dispatchEvent(
        new Event('tabs:click', {
          bubbles: true,
        })
      );
    });
  });

  window.dispatchEvent(new Event('tabs:register'));
})();
