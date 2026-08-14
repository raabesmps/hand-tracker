// Loads static HTML fragments (assets/includes/*.html) into any element
// tagged with data-include — a plain-file "include" mechanism that needs
// no build step and no server-side templating, just a fetch + swap.
async function loadIncludes() {
  const targets = document.querySelectorAll('[data-include]');

  await Promise.all(
    Array.from(targets).map(async (el) => {
      const path = el.getAttribute('data-include');
      try {
        const response = await fetch(path);
        el.outerHTML = await response.text();
      } catch (err) {
        console.error(`Falha ao carregar include "${path}":`, err);
      }
    }),
  );
}

loadIncludes();
