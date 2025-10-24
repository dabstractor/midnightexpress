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
     */
    const BOOKINGS_API_URL = 'https://script.google.com/macros/s/AKfycbzlJKEyRE9jriEa27errgYXQQA4mcVA0bZU1nxoILvCcBpXaW2FkCPwKZp1yewvDvKo/exec';

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
        console.log("allBookings: ", allBookings);

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
     * Update timeline when date changes
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @param {function} callback - Optional callback to receive bookings data
     */
    async function updateTimeline(dateStr, callback) {
        if (!dateStr) {
            $('#timeline-container').slideUp();
            if (callback) callback([]);
            return;
        }

        // Show loading state
        $('#timeline-date').text(formatDisplayDate(dateStr));
        $('#timeline-visual').html('<p style="text-align: center; color: #666;">Loading bookings...</p>');
        $('#timeline-container').slideDown();

        // Fetch bookings for this date
        const bookings = await getBookingsForDate(dateStr);

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
    // FORM INITIALIZATION
    // =================================================================

    $(function() {
        const $form = $('#bookingForm');
        if ($form.length === 0) {
            return; // Form not on this page
        }

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        $('#booking-date').val(today).attr('min', today);

        // Set default time to soonest available (3 hours from now, rounded up to next 15 minutes)
        const now = new Date();
        const soonestTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours

        // Round up to next 15-minute interval
        const minutes = soonestTime.getMinutes();
        const roundedMinutes = Math.ceil(minutes / 15) * 15;
        soonestTime.setMinutes(roundedMinutes);
        soonestTime.setSeconds(0);

        // Format as HH:MM for time input
        const hours = String(soonestTime.getHours()).padStart(2, '0');
        const mins = String(soonestTime.getMinutes()).padStart(2, '0');
        const defaultTime = hours + ':' + mins;

        $('#booking-time').val(defaultTime);

        // Pre-fetch bookings to warm cache
        fetchBookings();

        // Show/hide flight info based on airport pickup selection
        $('input[name="airport-pickup"]').on('change', function() {
            if ($('#airport-pickup-yes').is(':checked')) {
                $('#flight-info-section').slideDown();
            } else {
                $('#flight-info-section').slideUp();
                $('#booking-flight').val('');
            }
        });

        // Show/hide other requirement text field based on checkbox
        $('#booking-other-requirement').on('change', function() {
            if ($(this).is(':checked')) {
                $('#other-requirement-section').slideDown();
            } else {
                $('#other-requirement-section').slideUp();
                $('#booking-other-text').val('');
            }
        });

        // Update timeline when date changes and cache bookings for validation
        $('#booking-date').on('change', function() {
            const dateStr = $(this).val();
            updateTimeline(dateStr, function(bookings) {
                currentDateBookings = bookings;
            });
            // Clear time error when date changes
            $('#time-error').text('').hide();
        });

        // Store current date's bookings for instant validation
        let currentDateBookings = [];

        // Validate time when it changes (synchronous using cached data)
        $('#booking-time').on('change', function() {
            const dateStr = $('#booking-date').val();
            const timeStr = $(this).val();
            const $timeError = $('#time-error');

            if (!dateStr || !timeStr) {
                $timeError.text('').hide();
                return;
            }

            // Synchronous validation using cached bookings
            const validation = validateDateTimeSync(dateStr, timeStr, currentDateBookings);

            if (!validation.valid) {
                $timeError.text(validation.error).show();
            } else {
                $timeError.text('').hide();
            }
        });

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
            $(this).val(value);
            
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

        // Clear airport pickup error when selection is made
        $('input[name="airport-pickup"]').on('change', function() {
            $(this).closest('.form-group').find('.help-block').text('').hide();
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

            const formData = {
                name: $('#booking-name').val().trim(),
                phone: $('#booking-phone').val().trim(),
                email: $('#booking-email').val().trim(),
                pickupDate: $('#booking-date').val(),
                pickupAddress: $('#booking-pickup').val().trim(),
                destinationAddress: $('#booking-destination').val().trim(),
                passengers: $('#booking-passengers').val().trim(),
                specialNotes: $('#booking-notes').val().trim(),
                airportPickup: $('input[name="airport-pickup"]:checked').val(),
                flightNumber: $('#booking-flight').val().trim(),
                pickupTime: $('#booking-time').val(),
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
            if (!formData.phone) {
                errors.push('Phone number is required');
                $('#booking-phone').closest('.form-group').addClass('has-error').find('.help-block').text('Phone number is required').show();
                isValid = false;
            } else if (!validatePhone(formData.phone)) {
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

            // Pickup date validation
            if (!formData.pickupDate) {
                errors.push('Pickup date is required');
                $('#booking-date').closest('.form-group').addClass('has-error');
                $('#date-error').text('Pickup date is required').show();
                isValid = false;
            }

            // Pickup time validation
            if (!formData.pickupTime) {
                errors.push('Pickup time is required');
                $('#booking-time').closest('.form-group').addClass('has-error');
                $('#time-error').text('Pickup time is required').show();
                isValid = false;
            }

            // Airport pickup validation
            if (!formData.airportPickup) {
                errors.push('Please indicate if this is an airport pickup');
                $('input[name="airport-pickup"]').closest('.form-group').addClass('has-error').find('.help-block').text('Please select an option').show();
                isValid = false;
            }

            // Validate flight number if airport pickup is yes
            if (formData.airportPickup === 'Yes' && formData.flightNumber && !validateFlightNumber(formData.flightNumber)) {
                errors.push('Please enter a valid flight number (e.g., AA1234)');
                $('#booking-flight').closest('.form-group').addClass('has-error').find('.help-block').text('Please enter a valid flight number (e.g., AA1234)').show();
                isValid = false;
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

            // Prepare form data for Google Forms (exactly like contact form)
            var googleFormData = new FormData();
            googleFormData.append('entry.131833412', formData.name);
            googleFormData.append('entry.776900145', formData.phone);
            googleFormData.append('entry.121804187', formData.email);
            googleFormData.append('entry.1592582104', formData.pickupDate);
            googleFormData.append('entry.936388405', formData.pickupTime);
            googleFormData.append('entry.1137073125', formData.pickupAddress);
            googleFormData.append('entry.1747359283', formData.destinationAddress);
            googleFormData.append('entry.240227114', formData.passengers);
            googleFormData.append('entry.1761921696', formData.specialNotes);
            googleFormData.append('entry.1268043435', formData.airportPickup);
            googleFormData.append('entry.888870986', formData.flightNumber);

            // Special requirements checkboxes
            if (formData.specialRequirements && formData.specialRequirements.length > 0) {
                formData.specialRequirements.forEach(function(req) {
                    googleFormData.append('entry.1055055925', req);
                });
            }

            // Other requirement text (if "Other" was checked)
            if (formData.otherRequirementText) {
                googleFormData.append('entry.1055055925.other_option_response', formData.otherRequirementText);
            }

            // Submit to Google Forms (exactly like contact form)
            $.ajax({
                url: GOOGLE_FORM_URL,
                type: 'POST',
                data: googleFormData,
                processData: false,
                contentType: false,
                cache: false,
                complete: function() {
                    // Google Forms always returns an error due to CORS, but the submission actually works
                    const successHtml =
                        '<div class="alert alert-success">' +
                        '<h4><i class="fa fa-check-circle"></i> Booking Request Submitted!</h4>' +
                        '<p>Thank you, <strong>' + formData.name + '</strong>!</p>' +
                        '<p>Your booking request for <strong>' + formatDisplayDate(formData.pickupDate) + '</strong> at <strong>' + formData.pickupTime + '</strong> has been received.</p>' +
                        '<p>We will call you at <strong>' + formData.phone + '</strong> to confirm your booking.</p>' +
                        '<hr>' +
                        '<p><strong>Important:</strong> Your booking is not confirmed until you receive a call from us. If you don\'t hear from us within 2 hours, please call (980) 422-9125.</p>' +
                        '</div>';

                    $('#booking-success').html(successHtml).show();
                    $form.slideUp();
                    $submitBtn.html(originalBtnText).prop('disabled', false);

                    $('html, body').animate({
                        scrollTop: $('#booking-success').offset().top - 100
                    }, 500);

                    // Add "new booking" button
                    setTimeout(function() {
                        $('#booking-success').append(
                            '<p class="text-center" style="margin-top: 20px;">' +
                            '<button id="new-booking-btn" class="btn btn-primary">Make Another Booking</button>' +
                            '</p>'
                        );

                        $('#new-booking-btn').on('click', function() {
                            $form[0].reset();
                            $('#booking-success').html('').hide();
                            $('#timeline-container').hide();
                            $('#flight-info-section').hide();
                            $('#other-requirement-section').hide();
                            $form.slideDown();

                            // Re-set today's date
                            $('#booking-date').val(today);
                            updateTimeline(today);
                        });
                    }, 500);
                }
            });
        });

        // Initialize timeline with today's date and cache bookings
        updateTimeline(today, function(bookings) {
            currentDateBookings = bookings;
        });
    });

})(jQuery);
