// Orbital elements for J2000
// a: Semi-major axis (AU)
// e: Eccentricity
// i: Inclination (deg)
// O: Longitude of Ascending Node (deg)
// w: Argument of Perihelion (deg)
// M: Mean Anomaly (deg)
// period: Orbital period (years)

export const PLANETS = [
    {
        name: "Mercury",
        elements: { a: 0.387, e: 0.2056, i: 7.00, O: 48.33, w: 29.12, M: 174.79, period: 0.2408 },
        size: 0.38, // Relative to Earth
        color: 0xA5A5A5,
        texture: 'mercury.jpg',
        desc: "The smallest planet in the Solar System and the closest to the Sun."
    },
    {
        name: "Venus",
        elements: { a: 0.723, e: 0.0067, i: 3.39, O: 76.68, w: 54.88, M: 50.11, period: 0.6152 },
        size: 0.95,
        color: 0xE3BB76,
        texture: 'venus.jpg',
        desc: "Second planet from the Sun. It has the hottest surface of any planet."
    },
    {
        name: "Earth",
        elements: { a: 1.000, e: 0.0167, i: 0.00, O: 0.00, w: 102.9, M: 358.6, period: 1.0000 },
        size: 1.0,
        color: 0x2233FF,
        texture: 'earth.jpg',
        desc: "Our home planet. The only known planet to support life.",
        moons: [
            { name: "Moon", size: 0.27, distance: 0.00257, period: 0.0748, color: 0x888888, texture: 'moon_texture_1765206281385.png' }
        ]
    },
    {
        name: "Mars",
        elements: { a: 1.524, e: 0.0934, i: 1.85, O: 49.57, w: 286.5, M: 19.41, period: 1.8808 },
        size: 0.53,
        color: 0xDD4422,
        texture: 'mars.jpg',
        desc: "The Red Planet. Dusty, cold, desert world with a very thin atmosphere.",
        moons: [
            { name: "Phobos", size: 0.1, distance: 0.001, period: 0.0009, color: 0x555555, texture: 'phobos_texture_1765206085464.png' },
            { name: "Deimos", size: 0.08, distance: 0.002, period: 0.0035, color: 0x666666, texture: 'phobos_texture_1765206085464.png' }
        ]
    },
    {
        name: "Jupiter",
        elements: { a: 5.204, e: 0.0489, i: 1.30, O: 100.5, w: 273.8, M: 20.02, period: 11.862 },
        size: 11.2,
        color: 0xD9A066,
        texture: 'jupiter.jpg',
        desc: "The largest planet in the Solar System. A gas giant with a Great Red Spot.",
        moons: [
            { name: "Io", size: 0.28, distance: 0.015, period: 0.0048, color: 0xFFFF00, texture: 'io_texture_1765205220240.png' },
            { name: "Europa", size: 0.24, distance: 0.025, period: 0.0097, color: 0xCCCCCC, texture: 'europa_texture_1765205373511.png' },
            { name: "Ganymede", size: 0.41, distance: 0.04, period: 0.019, color: 0xDDDDDD, texture: 'ganymede_texture_1765205506743.png' },
            { name: "Callisto", size: 0.37, distance: 0.07, period: 0.045, color: 0x444444, texture: 'callisto_texture_1765205664044.png' }
        ]
    },
    {
        name: "Saturn",
        elements: { a: 9.582, e: 0.0565, i: 2.48, O: 113.7, w: 339.3, M: 317.0, period: 29.457 },
        size: 9.45,
        color: 0xFCDD8D,
        texture: 'saturn.jpg',
        hasRings: true,
        desc: "Adorned with a dazzling, complex system of icy rings.",
        moons: [
            { name: "Titan", size: 0.4, distance: 0.05, period: 0.043, color: 0xDDAA00, texture: 'titan_texture_1765205768477.png' }
        ]
    },
    {
        name: "Uranus",
        elements: { a: 19.20, e: 0.0463, i: 0.77, O: 74.00, w: 96.99, M: 142.5, period: 84.011 },
        size: 4.0,
        color: 0x4FD0E7,
        texture: 'uranus.jpg',
        desc: "An ice giant. It rotates at a nearly 90-degree angle from the plane of its orbit."
    },
    {
        name: "Neptune",
        elements: { a: 30.05, e: 0.0094, i: 1.76, O: 131.7, w: 273.1, M: 256.2, period: 164.79 },
        size: 3.88,
        color: 0x3344FF,
        texture: 'neptune.jpg',
        desc: "The eighth and most distant major planet orbiting our Sun. Dark, cold, and windy.",
        moons: [
            { name: "Triton", size: 0.21, distance: 0.02, period: 0.016, color: 0xFFAAAA, texture: 'triton_texture_1765205960291.png' }
        ]
    }
];
