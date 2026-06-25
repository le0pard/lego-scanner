export const menuState = $state({
  open: false
});
export const isMenuOpen = () => menuState.open;
export const toggleMenu = () => (menuState.open = !menuState.open);
export const closeMenu = () => (menuState.open = false);
