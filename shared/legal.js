// Páginas legales (aviso de privacidad y términos): mismo sistema de diseño,
// sin animaciones ni dependencias.
import './styles/base.css';
import './styles/legal.css';

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
