/**
 * Midnight Express LKN - Booking System
 *
 * Enhanced booking system with:
 * - Real-time booking conflict detection
 * - 24-hour timeline visualization
 * - Google Sheets integration
 * - Comprehensive validation matching Google Form
 */

(function($) {
    "use strict";

    // =================================================================
    // CONFIGURATION
    // =================================================================

    /**
     * URL to fetch existing bookings from Google Apps Script
     * Returns booking data including airportFlight field
     */
    const BOOKINGS_API_URL = 'https://script.google.com/macros/s/AKfycbyzD03cKqcnv4SIJ1n_Pt7jDbVQkJt5oR0yvXokdVpbyO7JqMQ3Px0UkbfkJLvdDRyf/exec';

    /**
     * Google Form submission URL (from the form action)
     */
    const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSelLJ8Yqj8jHXreIB3DW8MvsBUtHea8DB7UTjyaYkM3Q2RbTA/formResponse';

    /**
     * Booking buffer rules:
     * - Each ride takes 2 hours total (starting 15 min before pickup)
     * - Block from 2 hours BEFORE pickup time (allows previous ride to complete)
     * - Block until 1 hour 45 minutes AFTER pickup time
     * Total blocked window: 3 hours 45 minutes
     */
    const BUFFER_BEFORE_MINUTES = 120; // 2h
    const BUFFER_AFTER_MINUTES = 105; // 1h 45m

    /**
     * Cached bookings data
     */
    let cachedBookings = [];
    let lastFetchTime = null;
    const CACHE_DURATION_MS = 60000; // 1 minute

    // =================================================================
    // BOOKING DATA MANAGEMENT
    // =================================================================

    /**
     * Fetch bookings from Google Apps Script endpoint
     * @returns {Promise<Array>} - Array of booking objects
     */
    async function fetchBookings() {
        // Return cached data if still fresh
        if (lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION_MS)) {
            return Promise.resolve(cachedBookings);
        }

        return new Promise(function(resolve, reject) {
            $.ajax({
                url: BOOKINGS_API_URL,
                method: 'GET',
                dataType: 'json',
                cache: false,
                success: function(bookings) {
                    console.log('Fetched bookings:', bookings);
                    cachedBookings = bookings;
                    lastFetchTime = Date.now();
                    resolve(bookings);
                },
                error: function(xhr, status, error) {
                    console.error('Error fetching bookings:', status, error);
                    console.warn('Using cached or empty booking data');
                    // Return cached data as fallback, or empty array
                    resolve(cachedBookings.length > 0 ? cachedBookings : []);
                }
            });
        });
    }

    /**
     * Parse booking time from the weird Google Sheets format
     * Time comes as: "1899-12-30T15:17:11.000Z"
     * We only care about the time portion (15:17)
     *
     * @param {string} timeStr - Time string from API
     * @returns {object} - {hours: number, minutes: number}
     */
    function parseBookingTime(timeStr) {
        const date = new Date(timeStr);
        return {
            hours: date.getUTCHours(),
            minutes: date.getUTCMinutes()
        };
    }

    /**
     * Get all bookings for a specific date
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @returns {Promise<Array>} - Array of bookings for that date
     */
    async function getBookingsForDate(dateStr) {
        const allBookings = await fetchBookings();

        return allBookings.filter(function(booking) {
            return booking.date === dateStr;
        }).map(function(booking) {
            const time = parseBookingTime(booking.time);
            return {
                date: booking.date,
                hours: time.hours,
                minutes: time.minutes
            };
        });
    }

    /**
     * Calculate blocked time ranges for a booking
     * @param {number} hours - Booking hour (0-23)
     * @param {number} minutes - Booking minute (0-59)
     * @returns {object} - {startMinutes: number, endMinutes: number} (minutes since midnight)
     */
    function getBlockedRange(hours, minutes) {
        const bookingTimeMinutes = hours * 60 + minutes;

        return {
            startMinutes: bookingTimeMinutes - BUFFER_BEFORE_MINUTES,
            endMinutes: bookingTimeMinutes + BUFFER_AFTER_MINUTES
        };
    }

    /**
     * Check if a proposed time conflicts with existing bookings
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @param {string} timeStr - Time in HH:MM format
     * @param {Array} existingBookings - Array of bookings for the date
     * @returns {boolean} - True if there's a conflict
     */
    function hasTimeConflict(dateStr, timeStr, existingBookings) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const proposedTimeMinutes = hours * 60 + minutes;

        return existingBookings.some(function(booking) {
            const blocked = getBlockedRange(booking.hours, booking.minutes);
            return proposedTimeMinutes >= blocked.startMinutes &&
                   proposedTimeMinutes <= blocked.endMinutes;
        });
    }

    // =================================================================
    // TIMELINE VISUALIZATION
    // =================================================================

    /**
     * Format time in 12-hour format
     * @param {number} totalMinutes - Minutes since midnight
     * @returns {string} - Formatted time
     */
    function formatTimeFromMinutes(totalMinutes) {
        var hours = Math.floor(totalMinutes / 60);
        var minutes = totalMinutes % 60;
        var ampm = hours >= 12 ? 'PM' : 'AM';
        var displayHour = hours % 12 || 12;
        var displayMinutes = minutes < 10 ? '0' + minutes : minutes;
        return displayHour + ':' + displayMinutes + ' ' + ampm;
    }

    /**
     * Build 24-hour continuous timeline visualization showing exact blocked periods
     * @param {Array} bookings - Array of bookings for the selected date
     * @returns {string} - HTML for timeline
     */
    function buildTimeline(bookings) {
        // Create blocked ranges for each booking
        const blockedRanges = bookings.map(function(booking) {
            var range = getBlockedRange(booking.hours, booking.minutes);
            return {
                start: Math.max(0, range.startMinutes),
                end: Math.min(1440, range.endMinutes),
                bookingTime: booking.hours * 60 + booking.minutes
            };
        });

        // Sort by start time
        blockedRanges.sort(function(a, b) {
            return a.start - b.start;
        });

        // Merge overlapping ranges
        const mergedRanges = [];
        for (let i = 0; i < blockedRanges.length; i++) {
            const current = blockedRanges[i];

            // If mergedRanges is empty or current doesn't overlap with last merged range
            if (mergedRanges.length === 0 || current.start > mergedRanges[mergedRanges.length - 1].end) {
                mergedRanges.push({
                    start: current.start,
                    end: current.end
                });
            } else {
                // Overlaps with last merged range, extend the end time
                mergedRanges[mergedRanges.length - 1].end = Math.max(
                    mergedRanges[mergedRanges.length - 1].end,
                    current.end
                );
            }
        }

        // Build continuous timeline bar
        let html = '<div style="position: relative; margin: 20px 0;">';

        // Time labels at start and end
        html += '<div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px; color: #666;">';
        html += '<span>12:00 AM</span>';
        html += '<span>12:00 PM</span>';
        html += '<span>11:59 PM</span>';
        html += '</div>';

        // Main timeline bar (full 24 hours = 1440 minutes)
        html += '<div style="position: relative; height: 40px; background: #27AE60; border-radius: 4px; overflow: visible;">';

        // Overlay merged blocked periods
        mergedRanges.forEach(function(range) {
            var startPercent = (range.start / 1440) * 100;
            var widthPercent = ((range.end - range.start) / 1440) * 100;

            var startHours = Math.floor(range.start / 60);
            var startMinutes = range.start % 60;
            var endHours = Math.floor(range.end / 60);
            var endMinutes = range.end % 60;

            // Convert to 12-hour format with AM/PM
            var startAmPm = startHours >= 12 ? 'PM' : 'AM';
            var startDisplay = (startHours % 12) || 12;
            var startTime = startDisplay + ':' + (startMinutes < 10 ? '0' : '') + startMinutes + ' ' + startAmPm;

            var endAmPm = endHours >= 12 ? 'PM' : 'AM';
            var endDisplay = (endHours % 12) || 12;
            var endTime = endDisplay + ':' + (endMinutes < 10 ? '0' : '') + endMinutes + ' ' + endAmPm;

            // Blocked period bar with times inside
            html += '<div style="position: absolute; left: ' + startPercent + '%; width: ' + widthPercent + '%; height: 100%; background: #d9534f; border-radius: 2px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; line-height: 1.2;">';
            html += '<span>' + startTime + '</span>';
            html += '<span style="line-height: 0.2;">-</span>';
            html += '<span>' + endTime + '</span>';
            html += '</div>';
        });

        html += '</div>';

        html += '</div>';

        // Legend
        html += '<div style="display: flex; gap: 20px; margin-top: 10px; font-size: 12px; justify-content: center;">';
        html += '<div><span style="display: inline-block; width: 15px; height: 15px; background: #27AE60; border-radius: 2px; vertical-align: middle; margin-right: 5px;"></span>Available</div>';
        html += '<div><span style="display: inline-block; width: 15px; height: 15px; background: #d9534f; border-radius: 2px; vertical-align: middle; margin-right: 5px;"></span>Unavailable</div>';
        html += '</div>';

        return html;
    }

    /**
     * Format date for display
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @returns {string} - Formatted date
     */
    function formatDisplayDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Update timeline when date changes (uses cached bookings data)
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @param {function} callback - Optional callback to receive bookings data
     */
    function updateTimeline(dateStr, callback) {
        if (!dateStr) {
            $('#timeline-container').slideUp();
            if (callback) callback([]);
            return;
        }

        // Update date display and show container immediately
        $('#timeline-date').text(formatDisplayDate(dateStr));
        $('#timeline-container').slideDown();

        // Filter cached bookings for this date (no network call)
        const bookings = cachedBookings.filter(function(booking) {
            return booking.date === dateStr;
        }).map(function(booking) {
            const time = parseBookingTime(booking.time);
            return {
                date: booking.date,
                hours: time.hours,
                minutes: time.minutes
            };
        });

        if (bookings.length === 0) {
            $('#timeline-instruction').hide();
            $('#timeline-visual').html('<p style="text-align: center; color: #27AE60; font-weight: bold;">All times available!</p>');
        } else {
            $('#timeline-instruction').show();
            $('#timeline-visual').html(buildTimeline(bookings));
        }

        // Pass bookings to callback for caching
        if (callback) callback(bookings);
    }

    /**
     * Update return flight timeline when date changes (uses cached bookings data)
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @param {function} callback - Optional callback to receive bookings data
     */
    function updateReturnTimeline(dateStr, callback) {
        if (!dateStr) {
            $('#return-timeline-container').slideUp();
            if (callback) callback([]);
            return;
        }

        // Update date display and show container immediately
        $('#return-timeline-date').text(formatDisplayDate(dateStr));
        $('#return-timeline-container').slideDown();

        // Filter cached bookings for this date (no network call)
        const bookings = cachedBookings.filter(function(booking) {
            return booking.date === dateStr;
        }).map(function(booking) {
            const time = parseBookingTime(booking.time);
            return {
                date: booking.date,
                hours: time.hours,
                minutes: time.minutes
            };
        });

        if (bookings.length === 0) {
            $('#return-timeline-instruction').hide();
            $('#return-timeline-visual').html('<p style="text-align: center; color: #27AE60; font-weight: bold;">All times available!</p>');
        } else {
            $('#return-timeline-instruction').show();
            $('#return-timeline-visual').html(buildTimeline(bookings));
        }

        // Pass bookings to callback for caching
        if (callback) callback(bookings);
    }

    // =================================================================
    // VALIDATION
    // =================================================================

    /**
     * Validate phone number (must be 10 digits)
     * @param {string} phone - Phone number
     * @returns {boolean}
     */
    function validatePhone(phone) {
        const digitsOnly = phone.replace(/\D/g, '');
        return digitsOnly.length === 10;
    }

    /**
     * Validate email format
     * @param {string} email - Email address
     * @returns {boolean}
     */
    function validateEmail(email) {
        const pattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
        return pattern.test(email);
    }

    /**
     * Validate flight number format
     * @param {string} flightNumber - Flight number
     * @returns {boolean}
     */
    function validateFlightNumber(flightNumber) {
        const pattern = /^[a-zA-Z0-9]{2,3}[\s-]?\d{1,4}[a-zA-Z]?$/;
        return pattern.test(flightNumber);
    }

    /**
     * Synchronous validation using pre-loaded bookings
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @param {string} timeStr - Time in HH:MM format
     * @param {Array} bookings - Pre-loaded bookings for this date
     * @returns {object} - {valid: boolean, error: string}
     */
    function validateDateTimeSync(dateStr, timeStr, bookings) {
        if (!dateStr || !timeStr) {
            return {
                valid: false,
                error: 'Please select both date and time'
            };
        }

        // Check if in the past
        const selectedDateTime = new Date(dateStr + 'T' + timeStr);
        const now = new Date();

        if (selectedDateTime < now) {
            return {
                valid: false,
                error: 'Pickup time cannot be in the past'
            };
        }

        // Check minimum advance (3 hours)
        const minDateTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
        if (selectedDateTime < minDateTime) {
            return {
                valid: false,
                error: 'Please book at least 3 hours in advance. For urgent bookings, call (980) 422-9125'
            };
        }

        // Check booking conflicts
        if (hasTimeConflict(dateStr, timeStr, bookings)) {
            return {
                valid: false,
                error: 'This time slot is not available (conflicts with existing booking). Please choose a different time.'
            };
        }

        return {
            valid: true,
            error: ''
        };
    }

    /**
     * Validate date/time against bookings (async version for form submission)
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @param {string} timeStr - Time in HH:MM format
     * @returns {Promise<object>} - {valid: boolean, error: string}
     */
    async function validateDateTime(dateStr, timeStr) {
        const bookings = await getBookingsForDate(dateStr);
        return validateDateTimeSync(dateStr, timeStr, bookings);
    }

    // =================================================================
    // CONDITIONAL FIELD LOGIC
    // =================================================================

    /**
     * Update conditional fields based on airport trip and round trip selections
     * Follows existing show/hide patterns from booking.js
     */
    function updateConditionalFields() {
        const airportTrip = $('input[name="airport-trip"]:checked').val();
        const roundTrip = $('#booking-round-trip').is(':checked');

        // Show/hide checking bags and round trip sections
        if (airportTrip === 'Yes') {
            $('#checking-bags-section').slideDown();
            $('#round-trip-section').slideDown();
        } else {
            $('#checking-bags-section').slideUp();
            $('#round-trip-section').slideUp();
            $('#booking-checking-bags').prop('checked', false);
            $('#booking-round-trip').prop('checked', false);
        }

        // Show/hide return flight section and timeline
        if (airportTrip === 'Yes' && roundTrip) {
            $('#return-flight-section').slideDown();
            $('#return-timeline-container').slideDown();
        } else {
            $('#return-flight-section').slideUp();
            $('#return-timeline-container').slideUp();
            $('#booking-return-datetime').val('');
            $('#booking-flight').val('');
            $('#return-datetime-error').text('').hide();
        }
    }

    /**
     * Return Flight Validation
     * Validates that return datetime is after pickup datetime
     */
    function validateReturnFlight(pickupDateTime, returnDateTime) {
        if (!pickupDateTime || !returnDateTime) return true;

        const pickup = new Date(pickupDateTime);
        const returnDate = new Date(returnDateTime);

        if (returnDate <= pickup) {
            $('#return-datetime-error').text('Return date must be after pickup date').show();
            $('#booking-return-datetime').closest('.form-group').addClass('has-error');
            return false;
        }

        $('#return-datetime-error').text('').hide();
        $('#booking-return-datetime').closest('.form-group').removeClass('has-error');
        return true;
    }

    /**
     * Dynamic Passenger Capacity Calculation
     * Calculate max passengers based on special requirements
     *
     * Rules:
     * - Wheelchair = 1 seat
     * - Car seat = 1 seat
     * - Wheelchair + car seat = 1 seat (they can share a space)
     * - Airport checked bags = 1 full seat
     */
    function calculatePassengerCapacity(requirements) {
        let maxCapacity = 6; // Base capacity

        // Check if we have both wheelchair and car seat (they share 1 seat)
        const hasMobilityAids = requirements.wheelchair || requirements.carseat;
        if (hasMobilityAids) {
            maxCapacity -= 1; // Subtract 1 seat for either wheelchair OR car seat (or both, since they share)
        }

        // Checked bags always take a full seat
        if (requirements.checkingBags) {
            maxCapacity -= 1;
        }

        return Math.max(maxCapacity, 1); // Minimum 1 passenger
    }

    /**
     * Update passenger capacity display and validation
     */
    function updatePassengerCapacity() {
        const wheelchair = $('#booking-wheelchair').is(':checked');
        const carseat = $('#booking-carseat').is(':checked');
        const checkingBags = $('#booking-checking-bags').is(':checked');

        const requirements = {
            wheelchair: wheelchair,
            carseat: carseat,
            checkingBags: checkingBags
        };

        const maxCapacity = calculatePassengerCapacity(requirements);

        // Update or create capacity message
        let $capacityMsg = $('#passenger-capacity-message');
        if ($capacityMsg.length === 0) {
            $('#booking-passengers').closest('.form-group').append(
                '<small id="passenger-capacity-message" class="help-block" style="color: #666; font-size: 12px; margin-top: 5px;"></small>'
            );
            $capacityMsg = $('#passenger-capacity-message');
        }

        // Update capacity message with detailed explanation
        if (wheelchair || carseat || checkingBags) {
            let reductionReasons = [];
            if (wheelchair || carseat) {
                reductionReasons.push('mobility aid');
            }
            if (checkingBags) {
                reductionReasons.push('checked bags');
            }

            const reasonsText = reductionReasons.join(', ');
            $capacityMsg.text('Maximum passengers: ' + maxCapacity + ' (reduced for ' + reasonsText + ')').show();
        } else {
            $capacityMsg.text('');
        }

        // Update passenger input max attribute
        $('#booking-passengers').attr('max', maxCapacity);

        // Validate current passenger count
        const currentPassengers = parseInt($('#booking-passengers').val()) || 1;
        if (currentPassengers > maxCapacity) {
            $('#booking-passengers').val(maxCapacity);
            $capacityMsg.css('color', '#d9534f');
        } else {
            $capacityMsg.css('color', '#666');
        }
    }

    /**
     * Handle Dual Submission for Round-Trip Bookings
     * Creates two separate Google Sheets entries for round-trip bookings
     */
    async function handleDualSubmission(bookingData) {
        const submissions = [];

        // Create outbound submission (Is Return Flight = "No")
        const outboundSubmission = {
            name: bookingData.name,
            phone: bookingData.phone,
            email: bookingData.email,
            pickupDate: bookingData.pickupDate,
            pickupTime: bookingData.pickupTime,
            pickupAddress: bookingData.pickupAddress,
            destinationAddress: bookingData.destinationAddress,
            passengers: bookingData.passengers,
            specialNotes: bookingData.specialNotes,
            airportTrip: bookingData.airportTrip,
            flightNumber: '', // No flight number for outbound (dropping off at airport)
            checkingBags: bookingData.checkingBags,
            roundTrip: bookingData.roundTrip,
            returnDate: bookingData.returnDate,
            returnTime: bookingData.returnTime,
            specialRequirements: bookingData.specialRequirements,
            otherRequirementText: bookingData.otherRequirementText,
            isReturnFlight: 'No'
        };
        submissions.push(outboundSubmission);

        // Create return submission if round trip (Is Return Flight = "Yes")
        if (bookingData.roundTrip === 'Yes') {
            const returnSubmission = {
                name: bookingData.name,
                phone: bookingData.phone,
                email: bookingData.email,
                pickupDate: bookingData.returnDate,
                pickupTime: bookingData.returnTime,
                pickupAddress: bookingData.destinationAddress, // Swapped
                destinationAddress: bookingData.pickupAddress, // Swapped
                passengers: bookingData.passengers,
                specialNotes: bookingData.specialNotes,
                airportTrip: 'Yes', // Always "Yes" for return trips
                flightNumber: bookingData.flightNumber, // Use original flight number as return flight number
                checkingBags: bookingData.checkingBags, // Copy requirements
                roundTrip: bookingData.roundTrip,
                returnDate: '',
                returnTime: '',
                specialRequirements: bookingData.specialRequirements, // Copy all requirements
                otherRequirementText: bookingData.otherRequirementText,
                isReturnFlight: 'Yes'
            };
            submissions.push(returnSubmission);
        }

        // Submit to Google Sheets
        const submissionPromises = submissions.map(submission => submitToGoogleSheets(submission));
        const results = await Promise.allSettled(submissionPromises);

        // Check if all submissions succeeded
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
            console.error('Some submissions failed:', failures);
            throw new Error('One or more submissions failed');
        }

        return submissions;
    }

    /**
     * Submit booking data to Google Sheets
     * @param {Object} submissionData - Booking data to submit
     * @returns {Promise} - Submission promise
     */
    function submitToGoogleSheets(submissionData) {
        return new Promise(function(resolve, reject) {
            var googleFormData = new FormData();
            googleFormData.append('entry.131833412', submissionData.name);
            googleFormData.append('entry.776900145', submissionData.phone);
            googleFormData.append('entry.121804187', submissionData.email);
            googleFormData.append('entry.1592582104', submissionData.pickupDate + ' ' + submissionData.pickupTime); // Combined Pickup Date/Time
            googleFormData.append('entry.1137073125', submissionData.pickupAddress);
            googleFormData.append('entry.1747359283', submissionData.destinationAddress);
            googleFormData.append('entry.240227114', submissionData.passengers);
            googleFormData.append('entry.1761921696', submissionData.specialNotes); // Notes
            googleFormData.append('entry.1268043435', submissionData.airportTrip);
            googleFormData.append('entry.936388405', submissionData.pickupTime); // Pickup Time (separate)
            googleFormData.append('entry.1953484756', submissionData.checkingBags); // Checking Bags
            googleFormData.append('entry.2847103921', submissionData.roundTrip); // Round Trip Pickup
            googleFormData.append('entry.4859203847', submissionData.returnDate + ' ' + submissionData.returnTime); // Return Flight Landing Time
            googleFormData.append('entry.3948571029', submissionData.flightNumber || ''); // Return Flight Number (use original flight number for return trips)
            googleFormData.append('entry.5738291048', ''); // Return Flight Date/Landing Time (combined field)
            googleFormData.append('entry.6829374816', submissionData.isReturnFlight); // Is Return Flight

            // Special requirements checkboxes
            if (submissionData.specialRequirements && submissionData.specialRequirements.length > 0) {
                submissionData.specialRequirements.forEach(function(req) {
                    googleFormData.append('entry.1055055925', req);
                });
            }

            // Other requirement text (if "Other" was checked)
            if (submissionData.otherRequirementText) {
                googleFormData.append('entry.1055055925.other_option_response', submissionData.otherRequirementText);
            }

            // Submit to Google Forms
            $.ajax({
                url: GOOGLE_FORM_URL,
                type: 'POST',
                data: googleFormData,
                processData: false,
                contentType: false,
                cache: false,
                complete: function() {
                    // Google Forms always returns an error due to CORS, but the submission actually works
                    resolve();
                },
                error: function(xhr, status, error) {
                    // This is expected due to CORS, but we still consider it a success
                    resolve();
                }
            });
        });
    }

    /**
     * Find the first available booking time slot
     * @param {Date} currentTime - Current time
     * @returns {Date} - First available booking time
     */
    async function findFirstAvailableTime(currentTime) {
        const today = new Date(currentTime);
        today.setHours(0, 0, 0, 0);

        // Check if we need to look at tomorrow (past 8 PM or after 6 PM for bookings)
        const currentHour = currentTime.getHours();
        let searchDate = today;

        // If it's past 8 PM, start looking at tomorrow
        if (currentHour >= 20) {
            searchDate = new Date(today);
            searchDate.setDate(searchDate.getDate() + 1);
        }

        // Get bookings for the search date
        const bookings = await getBookingsForDate(searchDate.toISOString().split('T')[0]);

        // Find the first available time slot
        let searchTime = new Date(searchDate);

        // Start at 8 AM (8:00 AM) for current day, or 8 AM for future days
        if (searchDate.toDateString() === today.toDateString()) {
            // If it's current day, start from current time + buffer
            searchTime = new Date(currentTime.getTime() + (3 * 60 * 60 * 1000)); // 3 hour buffer

            // Round up to next 5-minute interval
            const minutes = searchTime.getMinutes();
            const roundedMinutes = Math.ceil(minutes / 5) * 5;
            searchTime.setMinutes(roundedMinutes);
            searchTime.setSeconds(0);

            // If the calculated time is past 8 PM, move to tomorrow
            if (searchTime.getHours() >= 20) {
                searchTime = new Date(searchDate);
                searchTime.setDate(searchTime.getDate() + 1);
                searchTime.setHours(8, 0, 0, 0);
            }
        } else {
            // For future days, start at 8 AM
            searchTime.setHours(8, 0, 0, 0);
        }

        // Check if the calculated time is too soon (less than 3 hours from now)
        const minAllowedTime = new Date(currentTime.getTime() + (3 * 60 * 60 * 1000));
        if (searchTime < minAllowedTime && searchDate.toDateString() === today.toDateString()) {
            // Time is too soon, show call message and set to next available slot
            showCallForBookingMessage();

            // Find the next available slot (at least 3 hours from now)
            searchTime = new Date(minAllowedTime);
            const minutes = searchTime.getMinutes();
            const roundedMinutes = Math.ceil(minutes / 5) * 5;
            searchTime.setMinutes(roundedMinutes);
            searchTime.setSeconds(0);

            // If this goes past 8 PM, move to tomorrow 8 AM
            if (searchTime.getHours() >= 20) {
                searchTime = new Date(today);
                searchTime.setDate(searchTime.getDate() + 1);
                searchTime.setHours(8, 0, 0, 0);
            }
        }

        return searchTime;
    }

    
    /**
     * Calculate simple default booking time (synchronous version)
     * @param {Date} currentTime - Current time
     * @returns {Date} - Default booking time
     */
    function calculateSimpleDefaultTime(currentTime) {
        const today = new Date(currentTime);
        const currentHour = currentTime.getHours();

        let defaultTime = new Date(today);

        // If it's past 8 PM, default to tomorrow 8 AM
        if (currentHour >= 20) {
            defaultTime.setDate(defaultTime.getDate() + 1);
            defaultTime.setHours(8, 0, 0, 0);
        } else {
            // Default to current time + 3 hours minimum
            defaultTime = new Date(currentTime.getTime() + (3 * 60 * 60 * 1000));

            // Round up to next 5-minute interval
            const minutes = defaultTime.getMinutes();
            const roundedMinutes = Math.ceil(minutes / 5) * 5;
            defaultTime.setMinutes(roundedMinutes);
            defaultTime.setSeconds(0);

            // If this goes past 8 PM, move to tomorrow 8 AM
            if (defaultTime.getHours() >= 20) {
                defaultTime = new Date(today);
                defaultTime.setDate(defaultTime.getDate() + 1);
                defaultTime.setHours(8, 0, 0, 0);
            }
        }

        // Ensure minimum 3-hour buffer (no banner - just set valid default)
        const minAllowedTime = new Date(currentTime.getTime() + (3 * 60 * 60 * 1000));
        if (defaultTime < minAllowedTime) {
            defaultTime = new Date(minAllowedTime);
            const minutes = defaultTime.getMinutes();
            const roundedMinutes = Math.ceil(minutes / 5) * 5;
            defaultTime.setMinutes(roundedMinutes);
            defaultTime.setSeconds(0);

            // If this goes past 8 PM, move to tomorrow 8 AM
            if (defaultTime.getHours() >= 20) {
                defaultTime = new Date(today);
                defaultTime.setDate(defaultTime.getDate() + 1);
                defaultTime.setHours(8, 0, 0, 0);
            }
        }

        return defaultTime;
    }

    // =================================================================
    // FORM INITIALIZATION
    // =================================================================

    $(function() {
        const $form = $('#bookingForm');
        if ($form.length === 0) {
            return; // Form not on this page
        }

        // Initialize with simple default time calculation first
        const now = new Date();
        const defaultDateTime = calculateSimpleDefaultTime(now);

        // Initialize Flatpickr
        $('#booking-datetime').flatpickr({
            enableTime: true,
            time_24hr: false,  // Display in 12-hour format
            dateFormat: "m/d/Y H:i:S",  // Store in 24-hour format MM/DD/YYYY HH:MM:SS
            altInput: true,
            altFormat: "m/d h:i K",  // Display in m/d format with 12-hour time and AM/PM
            minDate: "today",
            minuteIncrement: 5,
            disableMobile: "never",  // Use native mobile controls
            position: 'below',      // Critical: avoid timeline conflicts
            defaultDate: defaultDateTime,
            onClose: function(selectedDates, dateStr, instance) {
                if (selectedDates.length > 0) {
                    const date = selectedDates[0];
                    const formattedDate = date.toLocaleDateString('en-US');

                    // TRIGGER: Existing timeline update system
                    updateTimeline(formattedDate);

                    // MAINTAIN: Existing form field compatibility for backward compatibility
                    const dateForInput = date.toISOString().split('T')[0];
                    const timeForInput = date.toTimeString().slice(0, 8);
                    $('#booking-date').val(dateForInput);
                    $('#booking-time').val(timeForInput);
                }
            }
        });

        // Set initial hidden field values
        const dateForInput = defaultDateTime.toISOString().split('T')[0];
        const timeForInput = defaultDateTime.toTimeString().slice(0, 8);
        $('#booking-date').val(dateForInput);
        $('#booking-time').val(timeForInput);

        // Initialize Return Flight Flatpickr (only when round trip is selected)
        let returnFlatpickrInstance = null;

        function initializeReturnFlatpickr() {
            if (returnFlatpickrInstance) {
                returnFlatpickrInstance.destroy();
            }

            returnFlatpickrInstance = $('#booking-return-datetime').flatpickr({
                enableTime: true,
                time_24hr: false,  // Display in 12-hour format
                dateFormat: "m/d/Y H:i:S",  // Store in 24-hour format
                altInput: true,
                altFormat: "m/d h:i K",  // Display in m/d format with 12-hour time and AM/PM
                minDate: "today",
                minuteIncrement: 5,
                disableMobile: "never",
                position: 'below',
                onClose: function(selectedDates, dateStr, instance) {
                    if (selectedDates.length > 0) {
                        const date = selectedDates[0];

                        // Update hidden fields
                        const dateForInput = date.toISOString().split('T')[0];
                        const timeForInput = date.toTimeString().slice(0, 8);
                        $('#booking-return-date').val(dateForInput);
                        $('#booking-return-time').val(timeForInput);

                        // Update return timeline with correct date format (YYYY-MM-DD)
                        updateReturnTimeline(dateForInput);

                        // Validate return date is after pickup date
                        const pickupDateTime = $('#booking-datetime').val();
                        validateReturnFlight(pickupDateTime, dateStr);
                    }
                }
            });
        }

        // Initialize return Flatpickr when round trip is checked
        $('#booking-round-trip').on('change', function() {
            if ($(this).is(':checked')) {
                setTimeout(function() {
                    initializeReturnFlatpickr();
                }, 100); // Small delay to ensure the field is visible
            }
        });

        // Pre-fetch bookings to warm cache
        fetchBookings();

        // Show/hide conditional fields based on airport trip selection
        $('input[name="airport-trip"]').on('change', function() {
            updateConditionalFields();

            // Initialize flight formatter if airport trip is "Yes"
            if ($(this).val() === 'Yes') {
                setTimeout(function() {
                    $('#booking-flight').off('input.flight').on('input.flight', function() {
                        let value = $(this).val().toUpperCase().replace(/[^A-Z0-9]/g, '');

                        // Limit to reasonable flight number length (max 2-3 letters + 4 digits = 6-7 characters)
                        if (value.length > 7) {
                            value = value.substring(0, 7);
                        }

                        // Format as "AB 1234" (letters + space + numbers)
                        let formattedValue = '';
                        if (value.length > 0) {
                            // Find the split point between letters and numbers
                            let letterPart = '';
                            let numberPart = '';

                            for (let i = 0; i < value.length; i++) {
                                if (/[A-Z]/.test(value[i]) && numberPart === '') {
                                    letterPart += value[i];
                                } else {
                                    numberPart += value[i];
                                }
                            }

                            // Format: if we have both letters and numbers, add space between them
                            if (letterPart && numberPart) {
                                formattedValue = letterPart + ' ' + numberPart;
                            } else {
                                formattedValue = value; // Either only letters or only numbers
                            }
                        }

                        $(this).val(formattedValue);

                        // Clear error if flight number becomes valid
                        if (validateFlightNumber(formattedValue)) {
                            $(this).closest('.form-group').find('.help-block').text('').hide();
                        }
                    });
                }, 100); // Small delay to ensure the field is visible
            }
        });

        // Show/hide other requirement text field based on checkbox
        $('#booking-other-requirement').on('change', function() {
            if ($(this).is(':checked')) {
                $('#other-requirement-section').slideDown();
                $('#booking-other-text').attr('required', true);
            } else {
                $('#other-requirement-section').slideUp();
                $('#booking-other-text').val('').removeAttr('required');
            }
        });

        // Show/hide conditional fields based on round trip selection
        $('#booking-round-trip').on('change', function() {
            updateConditionalFields();
        });

        // Update passenger capacity when special requirements change
        $('#booking-wheelchair, #booking-carseat, #booking-checking-bags').on('change', function() {
            updatePassengerCapacity();
        });

        // Update passenger capacity on passenger input change
        $('#booking-passengers').on('input', function() {
            updatePassengerCapacity();
        });

        // Clear datetime error when date changes (handled by Flatpickr onClose)
        $('#booking-datetime').on('change', function() {
            $('#datetime-error').text('').hide();
        });

        // Store current date's bookings for instant validation
        let currentDateBookings = [];

        // Note: Time validation is now handled by Flatpickr onClose function
        // and form submission validation

        // Clear name error on input
        $('#booking-name').on('input', function() {
            if ($(this).val().trim()) {
                $(this).closest('.form-group').find('.help-block').text('').hide();
            }
        });

        // Auto-format phone as user types and validate
        $('#booking-phone').on('input', function() {
            let value = $(this).val().replace(/\D/g, '');
            if (value.length > 10) {
                value = value.substring(0, 10);
            }

            // Format as (123) 456 - 7890
            let formattedValue = '';
            if (value.length > 0) {
                if (value.length <= 3) {
                    formattedValue = '(' + value;
                } else if (value.length <= 6) {
                    formattedValue = '(' + value.substring(0, 3) + ') ' + value.substring(3);
                } else {
                    formattedValue = '(' + value.substring(0, 3) + ') ' + value.substring(3, 6) + ' - ' + value.substring(6);
                }
            }

            // Store the raw digits for validation and form submission
            $(this).data('raw-value', value);
            $(this).val(formattedValue);

            // Clear error if phone becomes valid
            if (validatePhone(value)) {
                $(this).closest('.form-group').find('.help-block').text('').hide();
            }
        });

        // Clear email error on valid input
        $('#booking-email').on('input', function() {
            const email = $(this).val().trim();
            if (!email || validateEmail(email)) {
                $(this).closest('.form-group').find('.help-block').text('').hide();
            }
        });

        // Clear airport trip error when selection is made
        $('input[name="airport-trip"]').on('change', function() {
            $(this).closest('.form-group').find('.help-block').text('').hide();
        });

        // Clear address errors when user starts typing
        $('#booking-pickup').on('input', function() {
            if ($(this).val().trim()) {
                $('#pickup-error').text('').hide();
                $(this).closest('.form-group').removeClass('has-error');
            }
        });

        $('#booking-destination').on('input', function() {
            if ($(this).val().trim()) {
                $('#destination-error').text('').hide();
                $(this).closest('.form-group').removeClass('has-error');
            }
        });

        // Clear "Other" requirement error when user types
        $('#booking-other-text').on('input', function() {
            if ($(this).val().trim()) {
                $(this).closest('.form-group').removeClass('has-error');
            }
        });

        // Clear error message when user starts typing again (like contact form)
        $('#booking-name, #booking-phone, #booking-email, #booking-pickup, #booking-destination, #booking-passengers, #booking-notes, #booking-flight, #booking-datetime, #booking-return-datetime, #booking-other-text').on('focus', function() {
            if ($('#booking-success .alert-danger').length > 0) {
                $('#booking-success').html('');
            }
        });

        // Form submission
        $form.on('submit', async function(e) {
            e.preventDefault();

            // Clear previous errors
            $('.help-block.text-danger').text('').hide();
            $('.has-error').removeClass('has-error');
            $('#booking-success').html('').hide();

            // Collect form data
            // Build special requirements from checked options
            const specialRequirements = [];
            let otherRequirementText = '';

            if ($('#booking-wheelchair').is(':checked')) {
                specialRequirements.push('Wheelchair');
            }
            if ($('#booking-carseat').is(':checked')) {
                specialRequirements.push('Carseat');
            }
            if ($('#booking-other-requirement').is(':checked')) {
                otherRequirementText = $('#booking-other-text').val().trim();
                if (otherRequirementText) {
                    specialRequirements.push('__other_option__');
                }
            }

            // Get datetime from hidden fields (populated by Flatpickr)
            const pickupDate = $('#booking-date').val();
            const pickupTime = $('#booking-time').val();

            // Get return flight data if round trip
            const returnDate = $('#booking-return-date').val();
            const returnTime = $('#booking-return-time').val();

            const formData = {
                name: $('#booking-name').val().trim(),
                phone: $('#booking-phone').data('raw-value') || $('#booking-phone').val().replace(/\D/g, ''),
                email: $('#booking-email').val().trim(),
                pickupDate: pickupDate,
                pickupAddress: $('#booking-pickup').val().trim(),
                destinationAddress: $('#booking-destination').val().trim(),
                passengers: $('#booking-passengers').val().trim(),
                specialNotes: $('#booking-notes').val().trim(),
                airportTrip: $('input[name="airport-trip"]:checked').val(),
                flightNumber: $('#booking-flight').val().trim(),
                pickupTime: pickupTime,
                checkingBags: $('#booking-checking-bags').is(':checked') ? 'Yes' : 'No',
                roundTrip: $('#booking-round-trip').is(':checked') ? 'Yes' : 'No',
                returnDate: returnDate,
                returnTime: returnTime,
                specialRequirements: specialRequirements,
                otherRequirementText: otherRequirementText
            };

            // Validation
            let errors = [];
            let isValid = true;

            // Name validation
            if (!formData.name) {
                errors.push('Name is required');
                $('#booking-name').closest('.form-group').addClass('has-error').find('.help-block').text('Name is required').show();
                isValid = false;
            }

            // Phone validation
            const rawPhone = $('#booking-phone').data('raw-value') || $('#booking-phone').val().replace(/\D/g, '');
            if (!rawPhone) {
                errors.push('Phone number is required');
                $('#booking-phone').closest('.form-group').addClass('has-error').find('.help-block').text('Phone number is required').show();
                isValid = false;
            } else if (!validatePhone(rawPhone)) {
                errors.push('Please enter a valid 10-digit phone number');
                $('#booking-phone').closest('.form-group').addClass('has-error').find('.help-block').text('Please enter a valid 10-digit phone number').show();
                isValid = false;
            }

            // Email validation (optional field, only validate if provided)
            if (formData.email && !validateEmail(formData.email)) {
                errors.push('Please enter a valid email address');
                $('#booking-email').closest('.form-group').addClass('has-error').find('.help-block').text('Please enter a valid email address').show();
                isValid = false;
            }

            // Pickup datetime validation
            if (!formData.pickupDate || !formData.pickupTime) {
                errors.push('Pickup date and time are required');
                $('#booking-datetime').closest('.form-group').addClass('has-error');
                $('#datetime-error').text('Pickup date and time are required').show();
                isValid = false;
            }

            // Pickup address validation
            if (!formData.pickupAddress) {
                errors.push('Pickup address is required');
                $('#booking-pickup').closest('.form-group').addClass('has-error');
                $('#pickup-error').text('Pickup address is required').show();
                isValid = false;
            }

            // Destination address validation
            if (!formData.destinationAddress) {
                errors.push('Destination address is required');
                $('#booking-destination').closest('.form-group').addClass('has-error');
                $('#destination-error').text('Destination address is required').show();
                isValid = false;
            }

            // Airport trip validation
            if (!formData.airportTrip) {
                errors.push('Please indicate if this is an airport trip');
                $('input[name="airport-trip"]').closest('.form-group').addClass('has-error').find('.help-block').text('Please select an option').show();
                isValid = false;
            }

            // Validate flight number if airport trip is yes
            if (formData.airportTrip === 'Yes' && formData.flightNumber && !validateFlightNumber(formData.flightNumber)) {
                errors.push('Please enter a valid flight number (e.g., AA1234)');
                $('#booking-flight').closest('.form-group').addClass('has-error').find('.help-block').text('Please enter a valid flight number (e.g., AA1234)').show();
                isValid = false;
            }

            // Validate "Other" special requirement text field if "Other" is checked
            if ($('#booking-other-requirement').is(':checked') && !$('#booking-other-text').val().trim()) {
                errors.push('Please specify your other special requirements');
                $('#booking-other-text').closest('.form-group').addClass('has-error');
                isValid = false;
            }

            // Validate passenger capacity
            const wheelchair = $('#booking-wheelchair').is(':checked');
            const carseat = $('#booking-carseat').is(':checked');
            const checkingBags = $('#booking-checking-bags').is(':checked');

            const requirements = {
                wheelchair: wheelchair,
                carseat: carseat,
                checkingBags: checkingBags
            };

            const maxCapacity = calculatePassengerCapacity(requirements);
            const passengerCount = parseInt(formData.passengers) || 1;

            if (passengerCount > maxCapacity) {
                errors.push('Maximum ' + maxCapacity + ' passengers allowed with selected special requirements');
                $('#booking-passengers').closest('.form-group').addClass('has-error');
                isValid = false;
            }

            // Validate return flight fields if round trip is yes
            if (formData.roundTrip === 'Yes') {
                // Return datetime validation
                if (!formData.returnDate || !formData.returnTime) {
                    errors.push('Return flight date and time are required for round trips');
                    $('#booking-return-datetime').closest('.form-group').addClass('has-error');
                    $('#return-datetime-error').text('Return flight date and time are required').show();
                    isValid = false;
                } else {
                    // Validate return date is after pickup date
                    const pickupDateTime = formData.pickupDate + ' ' + formData.pickupTime;
                    const returnDateTime = formData.returnDate + ' ' + formData.returnTime;
                    if (!validateReturnFlight(pickupDateTime, returnDateTime)) {
                        errors.push('Return date must be after pickup date');
                        isValid = false;
                    }
                }
            }

            // Re-validate date/time against latest bookings
            if (formData.pickupDate && formData.pickupTime) {
                const dateTimeValidation = await validateDateTime(formData.pickupDate, formData.pickupTime);
                if (!dateTimeValidation.valid) {
                    errors.push(dateTimeValidation.error);
                }
            }

            if (errors.length > 0) {
                let errorHtml = '<div class="alert alert-danger"><strong>Please correct the following:</strong><ul style="margin: 10px 0 0 0; padding-left: 20px;">';
                errors.forEach(function(error) {
                    errorHtml += '<li>' + error + '</li>';
                });
                errorHtml += '</ul></div>';

                $('#booking-success').html(errorHtml).show();
                $('html, body').animate({
                    scrollTop: $('#booking-success').offset().top - 100
                }, 500);
                return;
            }

            // Show submitting state
            const $submitBtn = $form.find('button[type="submit"]');
            const originalBtnText = $submitBtn.html();
            $submitBtn.html('<i class="fa fa-spinner fa-spin"></i> Submitting...').prop('disabled', true);

            try {
                // Handle dual submission for round-trip bookings
                const submissions = await handleDualSubmission(formData);

                // Create appropriate success message
                let successHtml =
                    '<div class="alert alert-success">' +
                    '<h4><i class="fa fa-check-circle"></i> Booking Request' + (formData.roundTrip === 'Yes' ? 's' : '') + ' Submitted!</h4>' +
                    '<p>Thank you, <strong>' + formData.name + '</strong>!</p>';

                if (formData.roundTrip === 'Yes') {
                    successHtml +=
                        '<p>Your round-trip booking requests have been received:</p>' +
                        '<ul style="text-align: left; display: inline-block;">' +
                        '<li><strong>Outbound:</strong> ' + formatDisplayDate(formData.pickupDate) + ' at ' + formData.pickupTime + '</li>' +
                        '<li><strong>Return:</strong> ' + formatDisplayDate(formData.returnDate) + ' at ' + formData.returnTime + '</li>' +
                        '</ul>' +
                        '<p>We will call you at <strong>' + formData.phone + '</strong> to confirm both bookings.</p>';
                } else {
                    successHtml +=
                        '<p>Your booking request for <strong>' + formatDisplayDate(formData.pickupDate) + '</strong> at <strong>' + formData.pickupTime + '</strong> has been received.</p>' +
                        '<p>We will call you at <strong>' + formData.phone + '</strong> to confirm your booking.</p>';
                }

                successHtml +=
                    '<hr>' +
                    '<p><strong>Important:</strong> Your booking' + (formData.roundTrip === 'Yes' ? 's are' : ' is') + ' not confirmed until you receive a call from us. If you don\'t hear from us within 2 hours, please call (980) 422-9125.</p>' +
                    '</div>';

                $('#booking-success').html(successHtml).show();

                // Hide the form (like contact form)
                $form.slideUp();

                // Reset button
                $submitBtn.html(originalBtnText).prop('disabled', false);

                // Scroll to success message
                $('html, body').animate({
                    scrollTop: $('#booking-success').offset().top - 100
                }, 500);

                // Show option to make another booking after 2 seconds (like contact form)
                setTimeout(function() {
                    $('#booking-success').append(
                        '<p class="text-center" style="margin-top: 20px;">' +
                        '<button id="new-booking-btn" class="btn btn-outline">Make Another Booking</button>' +
                        '</p>'
                    );

                    $('#new-booking-btn').on('click', function() {
                        $form[0].reset();
                        $('#booking-success').html('').hide();
                        $('#timeline-container').hide();
                        $('#checking-bags-section').hide();
                        $('#round-trip-section').hide();
                        $('#return-flight-section').hide();
                        $('#return-timeline-container').hide();
                        $('#other-requirement-section').hide();
                        $form.slideDown();

                        // Re-calculate default datetime using simple calculation
                        const now = new Date();
                        const newDefaultDateTime = calculateSimpleDefaultTime(now);

                        // Reset Flatpickr to new default time
                        $('#booking-datetime').flatpickr('setDate', newDefaultDateTime);

                        // Update hidden fields for timeline
                        const dateForInput = newDefaultDateTime.toISOString().split('T')[0];
                        const timeForInput = newDefaultDateTime.toTimeString().slice(0, 8);
                        $('#booking-date').val(dateForInput);
                        $('#booking-time').val(timeForInput);
                        updateTimeline(dateForInput);

                        // Scroll back to form
                        $('html, body').animate({
                            scrollTop: $form.offset().top - 100
                        }, 500);
                    });
                }, 2000);

            } catch (error) {
                console.error('Submission error:', error);
                const errorHtml =
                    '<div class="alert alert-danger">' +
                    '<h4><i class="fa fa-exclamation-triangle"></i> Submission Error</h4>' +
                    '<p>There was an error submitting your booking request. Please try again or call us directly at (980) 422-9125.</p>' +
                    '<p><strong>Error:</strong> ' + error.message + '</p>' +
                    '</div>';

                $('#booking-success').html(errorHtml).show();
                $submitBtn.html(originalBtnText).prop('disabled', false);

                $('html, body').animate({
                    scrollTop: $('#booking-success').offset().top - 100
                }, 500);
            }
        });

        // Initialize timeline with default date and cache bookings
        const todayForTimeline = defaultDateTime.toISOString().split('T')[0];
        updateTimeline(todayForTimeline, function(bookings) {
            currentDateBookings = bookings;
        });

        // Initialize passenger capacity display
        updatePassengerCapacity();
    });

    })(jQuery);
