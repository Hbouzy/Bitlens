
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  
  // Check if user previously set a theme preference
  const currentTheme = localStorage.getItem('theme');
  
  // If user previously chose dark theme
  if (currentTheme === 'dark') {
    document.documentElement.classList.add('dark-theme');
    themeToggle.checked = true;
  }
  
  // Toggle theme when the switch is clicked
  themeToggle.addEventListener('change', function() {
    if (this.checked) {
      // Dark mode
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      // Light mode
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  });
});
