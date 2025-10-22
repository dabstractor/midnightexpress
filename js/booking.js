/**
 * Midnight Express LKN - Booking System
 *
 * A comprehensive, client-side booking system with:
 * - Real-time validation
 * - Service area checking
 * - Date/time validation
 * - Quote calculation
 * - localStorage-based storage (interim solution)
 *
 * This system validates all inputs before submission and provides
 * clear feedback to users about any issues.
 */

(function($) {
    "use strict";

    // =================================================================
    // CONFIGURATION
    // =================================================================

    /**
     * Service areas that Midnight Express LKN serves
     * Used for validating pickup locations
     */
    const SERVICE_AREAS = [
        'Denver', 'Sherrills Ford', 'Catawba', 'Terrell', 'Maiden',
        'Pumpkin Center', 'Lincolnton', 'Iron Station', 'Lowesville',
        'Stanley County', 'Lake Norman'
    ];

    /**
     * Base rates for quote calculation (in dollars)
     * These are estimates - actual quotes are confirmed by phone
     */
    const BASE_RATES = {
        'CLT': 85,          // Charlotte Douglas International
        'Concord': 65,      // Concord Regional
        'Private': 75       // Private airports
    };

    /**
     * Additional passenger fee (after first 2 passengers)
     */
    const PER_PASSENGER_FEE = 10;

    /**
     * Minimum hours in advance for booking
     */
    const MIN_ADVANCE_HOURS = 3;

    /**
     * Maximum days in advance for booking
     */
    const MAX_ADVANCE_DAYS = 90;

    // =================================================================
    // UTILITY FUNCTIONS
    // =================================================================

    /**
     * Check if a location string contains any of the service areas
     * @param {string} location - The pickup location to check
     * @returns {boolean} - True if location is in service area
     */
    function isInServiceArea(location) {
        if (!location || location.trim() === '') {
            return false;
        }

        const locationLower = location.toLowerCase();

        return SERVICE_AREAS.some(function(area) {
            return locationLower.includes(area.toLowerCase());
        });
    }

    /**
     * Calculate estimated quote based on destination and passengers
     * @param {string} destination - Airport code (CLT, Concord, Private)
     * @param {number} passengers - Number of passengers
     * @returns {number} - Estimated price in dollars
     */
    function calculateQuote(destination, passengers) {
        if (!destination || !BASE_RATES[destination]) {
            return 0;
        }

        let baseRate = BASE_RATES[destination];
        let total = baseRate;

        // Add fee for passengers beyond 2
        if (passengers > 2) {
            total += (passengers - 2) * PER_PASSENGER_FEE;
        }

        return total;
    }

    /**
     * Validate that date/time is within acceptable booking window
     * @param {string} dateStr - Date string (YYYY-MM-DD)
     * @param {string} timeStr - Time string (HH:MM)
     * @returns {object} - {valid: boolean, error: string}
     */
    function validateDateTime(dateStr, timeStr) {
        if (!dateStr || !timeStr) {
            return {
                valid: false,
                error: 'Please select both date and time'
            };
        }

        // Parse the selected date/time
        const selectedDateTime = new Date(dateStr + 'T' + timeStr);
        const now = new Date();

        // Check if date is in the past
        if (selectedDateTime < now) {
            return {
                valid: false,
                error: 'Pickup time cannot be in the past'
            };
        }

        // Check minimum advance booking (3 hours)
        const minDateTime = new Date(now.getTime() + (MIN_ADVANCE_HOURS * 60 * 60 * 1000));
        if (selectedDateTime < minDateTime) {
            return {
                valid: false,
                error: 'Please book at least ' + MIN_ADVANCE_HOURS + ' hours in advance. For urgent bookings, please call (980) 422-9125'
            };
        }

        // Check maximum advance booking (90 days)
        const maxDateTime = new Date(now.getTime() + (MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000));
        if (selectedDateTime > maxDateTime) {
            return {
                valid: false,
                error: 'Bookings can only be made up to ' + MAX_ADVANCE_DAYS + ' days in advance'
            };
        }

        return {
            valid: true,
            error: ''
        };
    }

    /**
     * Format date for display
     * @param {string} dateStr - Date string (YYYY-MM-DD)
     * @returns {string} - Formatted date string
     */
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Format time for display (convert 24h to 12h)
     * @param {string} timeStr - Time string (HH:MM)
     * @returns {string} - Formatted time string
     */
    function formatTime(timeStr) {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return displayHour + ':' + minutes + ' ' + ampm;
    }

    /**
     * Save booking to localStorage
     * @param {object} bookingData - The booking data to save
     * @returns {string} - Booking ID
     */
    function saveBooking(bookingData) {
        const bookingId = 'BK' + Date.now();
        bookingData.id = bookingId;
        bookingData.status = 'pending';
        bookingData.createdAt = new Date().toISOString();

        // Get existing bookings
        let bookings = [];
        try {
            const stored = localStorage.getItem('midnightExpressBookings');
            if (stored) {
                bookings = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error reading bookings from localStorage:', e);
        }

        // Add new booking
        bookings.push(bookingData);

        // Save back to localStorage
        try {
            localStorage.setItem('midnightExpressBookings', JSON.stringify(bookings));
        } catch (e) {
            console.error('Error saving booking to localStorage:', e);
        }

        return bookingId;
    }

    /**
     * Validate email format
     * @param {string} email - Email address to validate
     * @returns {boolean} - True if valid email format
     */
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate phone number format
     * @param {string} phone - Phone number to validate
     * @returns {boolean} - True if valid phone format
     */
    function isValidPhone(phone) {
        // Remove all non-numeric characters
        const digitsOnly = phone.replace(/\D/g, '');
        // Check if it's a valid US phone number (10 or 11 digits)
        return digitsOnly.length === 10 || digitsOnly.length === 11;
    }

    // =================================================================
    // FORM HANDLING
    // =================================================================

    /**
     * Initialize the booking form when document is ready
     */
    $(function() {
        const $form = $('#bookingForm');
        if ($form.length === 0) {
            return; // Booking form not on this page
        }

        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        $('#booking-date').attr('min', today);

        // Set maximum date to MAX_ADVANCE_DAYS from now
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + MAX_ADVANCE_DAYS);
        $('#booking-date').attr('max', maxDate.toISOString().split('T')[0]);

        // =================================================================
        // REAL-TIME VALIDATION
        // =================================================================

        /**
         * Validate pickup location in real-time
         */
        $('#booking-pickup').on('blur', function() {
            const location = $(this).val().trim();
            const $error = $('#pickup-error');

            if (location === '') {
                $error.text('Pickup location is required').show();
                return;
            }

            if (!isInServiceArea(location)) {
                $error.html(
                    '<strong>Location may be outside service area.</strong><br>' +
                    'We serve: Denver, Sherrills Ford, Catawba, Terrell, Maiden, Pumpkin Center, ' +
                    'Lincolnton, Iron Station, Lowesville, and Stanley County.<br>' +
                    'Please call (980) 422-9125 to confirm availability.'
                ).show();
            } else {
                $error.text('').hide();
            }
        });

        /**
         * Validate date/time in real-time
         */
        function validateDateTimeFields() {
            const date = $('#booking-date').val();
            const time = $('#booking-time').val();
            const $dateError = $('#date-error');
            const $timeError = $('#time-error');

            // Clear previous errors
            $dateError.text('').hide();
            $timeError.text('').hide();

            if (!date || !time) {
                return; // Don't validate until both are filled
            }

            const validation = validateDateTime(date, time);
            if (!validation.valid) {
                $dateError.text(validation.error).show();
            }
        }

        $('#booking-date, #booking-time').on('change', validateDateTimeFields);

        /**
         * Update quote estimate when relevant fields change
         */
        function updateQuoteEstimate() {
            const destination = $('#booking-destination').val();
            const passengers = parseInt($('#booking-passengers').val(), 10);

            if (!destination || !passengers || passengers < 1) {
                $('#booking-quote').hide();
                return;
            }

            const quote = calculateQuote(destination, passengers);
            if (quote > 0) {
                let airportName = '';
                if (destination === 'CLT') {
                    airportName = 'Charlotte Douglas International Airport';
                } else if (destination === 'Concord') {
                    airportName = 'Concord Regional Airport';
                } else if (destination === 'Private') {
                    airportName = 'Private Airport';
                }

                $('#quote-details').html(
                    '<strong>Estimated fare to ' + airportName + ':</strong> $' + quote + '<br>' +
                    '<span style="font-size: 14px;">(' + passengers + ' passenger' + (passengers > 1 ? 's' : '') + ')</span>'
                );
                $('#booking-quote').slideDown();
            }
        }

        $('#booking-destination, #booking-passengers').on('change', updateQuoteEstimate);

        // =================================================================
        // FORM SUBMISSION
        // =================================================================

        /**
         * Handle booking form submission
         */
        $form.on('submit', function(e) {
            e.preventDefault();

            // Clear previous success messages
            $('#booking-success').hide().html('');

            // Collect form data
            const formData = {
                name: $('#booking-name').val().trim(),
                phone: $('#booking-phone').val().trim(),
                email: $('#booking-email').val().trim(),
                passengers: parseInt($('#booking-passengers').val(), 10),
                pickup: $('#booking-pickup').val().trim(),
                destination: $('#booking-destination').val(),
                date: $('#booking-date').val(),
                time: $('#booking-time').val(),
                notes: $('#booking-notes').val().trim()
            };

            // =================================================================
            // COMPREHENSIVE VALIDATION
            // =================================================================

            let errors = [];

            // Validate name
            if (!formData.name) {
                errors.push('Please enter your name');
            }

            // Validate phone
            if (!formData.phone) {
                errors.push('Please enter your phone number');
            } else if (!isValidPhone(formData.phone)) {
                errors.push('Please enter a valid phone number');
            }

            // Validate email
            if (!formData.email) {
                errors.push('Please enter your email address');
            } else if (!isValidEmail(formData.email)) {
                errors.push('Please enter a valid email address');
            }

            // Validate passengers
            if (!formData.passengers || formData.passengers < 1) {
                errors.push('Please enter number of passengers');
            } else if (formData.passengers > 10) {
                errors.push('For groups larger than 10, please call us at (980) 422-9125');
            }

            // Validate pickup location
            if (!formData.pickup) {
                errors.push('Please enter pickup location');
            }

            // Validate destination
            if (!formData.destination) {
                errors.push('Please select airport destination');
            }

            // Validate date and time
            if (!formData.date) {
                errors.push('Please select pickup date');
            }
            if (!formData.time) {
                errors.push('Please select pickup time');
            }

            if (formData.date && formData.time) {
                const dateTimeValidation = validateDateTime(formData.date, formData.time);
                if (!dateTimeValidation.valid) {
                    errors.push(dateTimeValidation.error);
                }
            }

            // Show errors if any
            if (errors.length > 0) {
                let errorHtml = '<div class="alert alert-danger"><strong>Please correct the following:</strong><ul style="margin: 10px 0 0 0; padding-left: 20px;">';
                errors.forEach(function(error) {
                    errorHtml += '<li>' + error + '</li>';
                });
                errorHtml += '</ul></div>';

                $('#booking-success').html(errorHtml).show();

                // Scroll to error message
                $('html, body').animate({
                    scrollTop: $('#booking-success').offset().top - 100
                }, 500);

                return;
            }

            // =================================================================
            // SAVE BOOKING
            // =================================================================

            const bookingId = saveBooking(formData);

            // Calculate final quote
            const quote = calculateQuote(formData.destination, formData.passengers);

            // Show success message
            let destinationName = formData.destination;
            if (formData.destination === 'CLT') {
                destinationName = 'Charlotte Douglas International Airport';
            } else if (formData.destination === 'Concord') {
                destinationName = 'Concord Regional Airport';
            } else if (formData.destination === 'Private') {
                destinationName = 'Private Airport';
            }

            const successHtml =
                '<div class="alert alert-success" style="text-align: left;">' +
                '<h4 style="margin-top: 0;"><i class="fa fa-check-circle"></i> Booking Request Received!</h4>' +
                '<p><strong>Booking Reference:</strong> ' + bookingId + '</p>' +
                '<hr style="border-color: #d6e9c6;">' +
                '<p><strong>Details:</strong></p>' +
                '<ul style="line-height: 1.8;">' +
                '<li><strong>Passenger:</strong> ' + formData.name + '</li>' +
                '<li><strong>Phone:</strong> ' + formData.phone + '</li>' +
                '<li><strong>Pickup:</strong> ' + formData.pickup + '</li>' +
                '<li><strong>Destination:</strong> ' + destinationName + '</li>' +
                '<li><strong>Date:</strong> ' + formatDate(formData.date) + '</li>' +
                '<li><strong>Time:</strong> ' + formatTime(formData.time) + '</li>' +
                '<li><strong>Passengers:</strong> ' + formData.passengers + '</li>' +
                '<li><strong>Estimated Fare:</strong> $' + quote + '</li>' +
                '</ul>' +
                '<hr style="border-color: #d6e9c6;">' +
                '<p><strong>Next Steps:</strong></p>' +
                '<ol style="line-height: 1.8;">' +
                '<li>We will call you at <strong>' + formData.phone + '</strong> to confirm your booking</li>' +
                '<li>We\'ll finalize the exact pickup time and provide any additional details</li>' +
                '<li>You\'ll receive confirmation and our driver\'s contact information</li>' +
                '</ol>' +
                '<p style="margin-top: 15px; padding: 15px; background: #fcf8e3; border: 1px solid #faebcc; border-radius: 4px;">' +
                '<strong><i class="fa fa-info-circle"></i> Important:</strong> ' +
                'Your booking is not confirmed until you receive a call from us. ' +
                'If you don\'t hear from us within 2 hours, please call (980) 422-9125.' +
                '</p>' +
                '</div>';

            $('#booking-success').html(successHtml).show();

            // Hide the form
            $form.slideUp();

            // Scroll to success message
            $('html, body').animate({
                scrollTop: $('#booking-success').offset().top - 100
            }, 500);

            // Show option to make another booking
            setTimeout(function() {
                $('#booking-success').append(
                    '<p class="text-center" style="margin-top: 20px;">' +
                    '<button id="new-booking-btn" class="btn btn-primary">' +
                    '<i class="fa fa-plus"></i> Make Another Booking' +
                    '</button>' +
                    '</p>'
                );

                $('#new-booking-btn').on('click', function() {
                    // Reset form
                    $form[0].reset();
                    $('#booking-success').html('').hide();
                    $('#booking-quote').hide();
                    $form.slideDown();

                    // Scroll to form
                    $('html, body').animate({
                        scrollTop: $form.offset().top - 100
                    }, 500);
                });
            }, 1000);
        });

        // =================================================================
        // FORM FIELD ENHANCEMENTS
        // =================================================================

        /**
         * Auto-format phone number as user types
         */
        $('#booking-phone').on('input', function() {
            let value = $(this).val().replace(/\D/g, '');
            if (value.length > 10) {
                value = value.substring(0, 10);
            }

            if (value.length >= 6) {
                value = '(' + value.substring(0, 3) + ') ' + value.substring(3, 6) + '-' + value.substring(6);
            } else if (value.length >= 3) {
                value = '(' + value.substring(0, 3) + ') ' + value.substring(3);
            }

            $(this).val(value);
        });

        /**
         * Prevent invalid characters in passengers field
         */
        $('#booking-passengers').on('input', function() {
            let value = parseInt($(this).val(), 10);
            if (isNaN(value) || value < 1) {
                $(this).val('');
            } else if (value > 10) {
                $(this).val(10);
            }
        });

        // =================================================================
        // ACCESSIBILITY ENHANCEMENTS
        // =================================================================

        /**
         * Add ARIA live region for dynamic feedback
         */
        $form.attr('aria-live', 'polite');

        /**
         * Ensure all form fields have proper labels
         */
        $form.find('input, select, textarea').each(function() {
            const $field = $(this);
            const id = $field.attr('id');
            const $label = $('label[for="' + id + '"]');

            if ($label.length === 0) {
                // If no explicit label, add aria-label from placeholder
                const placeholder = $field.attr('placeholder');
                if (placeholder) {
                    $field.attr('aria-label', placeholder);
                }
            }
        });
    });

    // =================================================================
    // ADMIN FUNCTIONS (for future use)
    // =================================================================

    /**
     * Get all bookings from localStorage
     * @returns {Array} - Array of booking objects
     */
    window.MidnightExpressBooking = {
        getAllBookings: function() {
            try {
                const stored = localStorage.getItem('midnightExpressBookings');
                return stored ? JSON.parse(stored) : [];
            } catch (e) {
                console.error('Error reading bookings:', e);
                return [];
            }
        },

        /**
         * Get booking by ID
         * @param {string} bookingId - The booking ID
         * @returns {object|null} - Booking object or null if not found
         */
        getBooking: function(bookingId) {
            const bookings = this.getAllBookings();
            return bookings.find(function(b) { return b.id === bookingId; }) || null;
        },

        /**
         * Clear all bookings (use with caution)
         */
        clearAllBookings: function() {
            if (confirm('Are you sure you want to clear all bookings? This cannot be undone.')) {
                localStorage.removeItem('midnightExpressBookings');
                alert('All bookings have been cleared.');
            }
        },

        /**
         * Export bookings to JSON
         */
        exportBookings: function() {
            const bookings = this.getAllBookings();
            const dataStr = JSON.stringify(bookings, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'midnight-express-bookings-' + new Date().toISOString().split('T')[0] + '.json';
            link.click();
            URL.revokeObjectURL(url);
        }
    };

})(jQuery);
