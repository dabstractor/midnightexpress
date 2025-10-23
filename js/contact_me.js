$(function() {
    // Handle contact form submission
    $('#contactForm').on('submit', function(e) {
        e.preventDefault(); // Prevent default form submission

        // Get values from form
        var name = $("input#name").val().trim();
        var email = $("input#email").val().trim();
        var phone = $("input#phone").val().trim();
        var message = $("textarea#message").val().trim();

        // Validation
        var errors = [];

        if (!name) {
            errors.push('Please enter your name');
        }

        if (!email) {
            errors.push('Please enter your email address');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Please enter a valid email address');
        }

        if (!phone) {
            errors.push('Please enter your phone number');
        }

        if (!message) {
            errors.push('Please enter a message');
        }

        // Show validation errors
        if (errors.length > 0) {
            var errorHtml = "<div class='alert alert-danger'>";
            errorHtml += "<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button>";
            errorHtml += "<strong>Please correct the following:</strong><ul style='margin: 10px 0 0 0; padding-left: 20px;'>";
            errors.forEach(function(error) {
                errorHtml += '<li>' + error + '</li>';
            });
            errorHtml += '</ul></div>';

            $('#success').html(errorHtml);
            return;
        }

        // Get submit button
        var $submitBtn = $('#contactForm button[type="submit"]');
        var originalBtnText = $submitBtn.html();

        // Show loading state
        $submitBtn.html('<i class="fa fa-spinner fa-spin"></i> Sending...').prop('disabled', true);
        $('#success').html('');

        // Prepare form data for Google Forms
        var formData = new FormData();
        formData.append('entry.1985816523', name);      // Name field
        formData.append('entry.273400507', email);      // Email field
        formData.append('entry.957694700', phone);      // Phone field
        formData.append('entry.1809036523', message);   // Message field

        // Submit to Google Forms
        $.ajax({
            url: "https://docs.google.com/forms/u/0/d/e/1FAIpQLSeCnWIvGMRYtKOpwtVMRKYjwpJUmCyhw3vGn4zcYZ4xoJ_UvQ/formResponse",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            cache: false,
            complete: function() {
                // Google Forms always returns an error due to CORS, but the submission actually works
                // So we treat complete as success

                // Show success message
                var successHtml = "<div class='alert alert-success'>" +
                    "<h4><i class='fa fa-check-circle'></i> Message Sent!</h4>" +
                    "<p>Thank you, <strong>" + name + "</strong>! Your message has been received.</p>" +
                    "<p>We'll get back to you at <strong>" + email + "</strong> as soon as possible.</p>" +
                    "</div>";

                $('#success').html(successHtml).show();

                // Hide the form
                $('#contactForm').slideUp();

                // Reset button
                $submitBtn.html(originalBtnText).prop('disabled', false);

                // Scroll to success message
                $('html, body').animate({
                    scrollTop: $('#success').offset().top - 100
                }, 500);

                // Show option to send another message after 2 seconds
                setTimeout(function() {
                    $('#success').append(
                        '<p class="text-center" style="margin-top: 20px;">' +
                        '<button id="new-message-btn" class="btn btn-outline">Send Another Message</button>' +
                        '</p>'
                    );

                    $('#new-message-btn').on('click', function() {
                        $('#contactForm')[0].reset();
                        $('#success').html('').hide();
                        $('#contactForm').slideDown();

                        $('html, body').animate({
                            scrollTop: $('#contactForm').offset().top - 100
                        }, 500);
                    });
                }, 2000);
            }
        });
    });

    // Clear error message when user starts typing again
    $('#name, #email, #phone, #message').on('focus', function() {
        if ($('#success .alert-danger').length > 0) {
            $('#success').html('');
        }
    });
});
