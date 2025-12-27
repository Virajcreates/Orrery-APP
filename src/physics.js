/**
 * Calculates the position of a planet based on Keplerian orbital elements.
 * 
 * @param {Object} elements - Orbital elements
 * @param {number} elements.a - Semi-major axis (AU)
 * @param {number} elements.e - Eccentricity
 * @param {number} elements.i - Inclination (degrees)
 * @param {number} elements.O - Longitude of ascending node (degrees)
 * @param {number} elements.w - Argument of periapsis (degrees)
 * @param {number} elements.M - Mean anomaly at epoch (degrees) (J2000)
 * @param {number} elements.period - Orbital period (years)
 * @param {Date} date - The date to calculate the position for
 * @returns {Object} { x, y, z } coordinates in 3D space (scaled)
 */
export function calculatePosition(elements, date) {
    const J2000 = new Date('2000-01-01T12:00:00Z');
    const daysSinceJ2000 = (date - J2000) / (1000 * 60 * 60 * 24);

    // Mean Anomaly at current time
    // M(t) = M0 + n * t
    // n = 360 / period (degrees per day) -> period is in years, so 360 / (period * 365.25)
    const n = 360 / (elements.period * 365.25);
    let M = elements.M + n * daysSinceJ2000;

    // Normalize M to 0-360
    M = M % 360;
    if (M < 0) M += 360;

    // Convert degrees to radians
    const d2r = Math.PI / 180;
    const e = elements.e;
    const a = elements.a;
    const i = elements.i * d2r;
    const O = elements.O * d2r;
    const w = elements.w * d2r;
    const M_rad = M * d2r;

    // Solve Kepler's Equation: M = E - e * sin(E) for E (Eccentric Anomaly)
    // Newton-Raphson iteration
    let E = M_rad;
    for (let j = 0; j < 10; j++) {
        E = E - (E - e * Math.sin(E) - M_rad) / (1 - e * Math.cos(E));
    }

    // True Anomaly (v)
    // tan(v/2) = sqrt((1+e)/(1-e)) * tan(E/2)
    const v = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));

    // Distance (r)
    const r = a * (1 - e * Math.cos(E));

    // Heliocentric coordinates in orbital plane
    const x_orb = r * Math.cos(v);
    const y_orb = r * Math.sin(v);

    // Rotate to ecliptic coordinates
    // x = x_orb * (cos(w)cos(O) - sin(w)sin(O)cos(i)) - y_orb * (sin(w)cos(O) + cos(w)sin(O)cos(i))
    // y = x_orb * (cos(w)sin(O) + sin(w)cos(O)cos(i)) - y_orb * (sin(w)sin(O) - cos(w)cos(O)cos(i))
    // z = x_orb * (sin(w)sin(i)) + y_orb * (cos(w)sin(i))

    const cos_w = Math.cos(w);
    const sin_w = Math.sin(w);
    const cos_O = Math.cos(O);
    const sin_O = Math.sin(O);
    const cos_i = Math.cos(i);
    const sin_i = Math.sin(i);

    const x = x_orb * (cos_w * cos_O - sin_w * sin_O * cos_i) - y_orb * (sin_w * cos_O + cos_w * sin_O * cos_i);
    const y = x_orb * (cos_w * sin_O + sin_w * cos_O * cos_i) - y_orb * (sin_w * sin_O - cos_w * cos_O * cos_i);
    const z = x_orb * (sin_w * sin_i) + y_orb * (cos_w * sin_i);

    // Three.js uses Y-up, but astronomy usually uses Z-up. 
    // Let's map: x -> x, y -> z, z -> -y (or similar) to match standard view
    // Actually, let's keep it simple: x=x, z=y (depth), y=z (up/down is inclination)
    // But usually we look "down" on the solar system.

    return { x: x, y: z, z: -y }; // Swapping Y and Z for Three.js coordinate system (Y is up)
}
