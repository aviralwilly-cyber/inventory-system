// import React, { useEffect } from 'react';

// const ParticlesBackground = () => {
//   useEffect(() => {
//     const loadParticlesScript = async () => {
//       // Check if script already exists
//       if (!document.getElementById('particles-script')) {
//         const script = document.createElement('script');
//         script.src = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';
//         script.id = 'particles-script';
//         script.async = true;

//         // Wait for script to load
//         await new Promise((resolve, reject) => {
//           script.onload = resolve;
//           script.onerror = reject;
//           document.body.appendChild(script);
//         });
//       }

//       // Initialize particles
//       if (window.particlesJS) {
//         window.particlesJS('particles-js', {
//           particles: {
//             number: {
//               value: 80,
//               density: {
//                 enable: true,
//                 value_area: 800
//               }
//             },
//             color: {
//               value: '#4B5563' // Gray color for particles
//             },
//             shape: {
//               type: 'circle'
//             },
//             opacity: {
//               value: 0.5,
//               random: false
//             },
//             size: {
//               value: 3,
//               random: true
//             },
//             line_linked: {
//               enable: true,
//               distance: 150,
//               color: '#FF0000', // Gray color for lines
//               opacity: 0.4,
//               width: 1
//             },
//             move: {
//               enable: false, // Disable movement for particles
//               speed: 3,
//               direction: 'none',
//               random: false,
//               straight: false,
//               out_mode: 'out',
//               bounce: false,
//             }
//           },
//           interactivity: {
//             detect_on: 'canvas',
//             events: {
//               onhover: {
//                 enable: true,
//                 mode: 'grab'
//               },
//               onclick: {
//                 enable: true,
//                 mode: 'push'
//               },
//               resize: true
//             }
//           },
//           retina_detect: true
//         });
//       }
//     };

//     loadParticlesScript();

//     // Cleanup function
//     return () => {
//       const script = document.getElementById('particles-script');
//       if (script) {
//         document.body.removeChild(script);
//       }
//       if (window.pJSDom && window.pJSDom[0]?.pJS) {
//         window.pJSDom[0].pJS.fn.vendors.destroypJS();
//         window.pJSDom = [];
//       }
//     };
//   }, []);

//   return (
//     <div
//       id="particles-js"
//       style={{
//         position: 'fixed',
//         top: 0,
//         left: 0,
//         width: '100%',
//         height: '100%',
//         zIndex: 1,
//         background: 'transparent',
//         pointerEvents: 'none'
//       }}
//     />
//   );
// };

// export default ParticlesBackground;