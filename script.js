/* =========================================
   JENGA CAPITAL
   MAIN JAVASCRIPT
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =========================================
       MOBILE NAVIGATION
    ========================================= */

    const mobileMenuButton =
        document.querySelector(".mobile-menu-button");

    const mobileNav =
        document.querySelector(".mobile-nav");

    if (mobileMenuButton && mobileNav) {

        mobileMenuButton.addEventListener("click", () => {

            mobileNav.classList.toggle("active");

            const isOpen =
                mobileNav.classList.contains("active");

            mobileMenuButton.setAttribute(
                "aria-expanded",
                isOpen
            );

            mobileMenuButton.innerHTML =
                isOpen ? "✕" : "☰";
        });


        /* Close menu when clicking a link */

        const mobileLinks =
            mobileNav.querySelectorAll("a");

        mobileLinks.forEach((link) => {

            link.addEventListener("click", () => {

                mobileNav.classList.remove("active");

                mobileMenuButton.innerHTML = "☰";

                mobileMenuButton.setAttribute(
                    "aria-expanded",
                    "false"
                );
            });

        });

    }


    /* =========================================
       SMOOTH SCROLLING
    ========================================= */

    const internalLinks =
        document.querySelectorAll(
            'a[href^="#"]'
        );

    internalLinks.forEach((link) => {

        link.addEventListener("click", (event) => {

            const targetId =
                link.getAttribute("href");

            if (
                !targetId ||
                targetId === "#"
            ) {
                return;
            }

            const target =
                document.querySelector(targetId);

            if (!target) {
                return;
            }

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        });

    });


    /* =========================================
       LOAN CALCULATOR
    ========================================= */

    const loanAmount =
        document.querySelector("#loanAmount");

    const interestRate =
        document.querySelector("#interestRate");

    const loanTerm =
        document.querySelector("#loanTerm");

    const monthlyPayment =
        document.querySelector("#monthlyPayment");

    const totalRepayment =
        document.querySelector("#totalRepayment");

    const totalInterest =
        document.querySelector("#totalInterest");

    const amountDisplay =
        document.querySelector("#amountDisplay");

    const interestDisplay =
        document.querySelector("#interestDisplay");

    const termDisplay =
        document.querySelector("#termDisplay");


    /*
       Format numbers as Kenyan Shillings.
    */

    function formatCurrency(value) {

        return new Intl.NumberFormat(
            "en-KE",
            {
                style: "currency",
                currency: "KES",
                maximumFractionDigits: 0
            }
        ).format(value);

    }


    /*
       Calculate monthly repayment.

       Formula:
       M = P × r × (1+r)^n
           ----------------
             (1+r)^n - 1

       P = Principal
       r = Monthly interest rate
       n = Number of payments
    */

    function calculateLoan() {

        if (
            !loanAmount ||
            !interestRate ||
            !loanTerm
        ) {
            return;
        }

        const principal =
            Number(loanAmount.value);

        const annualRate =
            Number(interestRate.value);

        const months =
            Number(loanTerm.value);


        if (
            !principal ||
            !months
        ) {
            return;
        }


        /*
           Convert annual percentage
           into monthly decimal rate.
        */

        const monthlyRate =
            annualRate / 100 / 12;


        let monthly;


        /*
           If interest rate is zero,
           simply divide principal by months.
        */

        if (monthlyRate === 0) {

            monthly =
                principal / months;

        } else {

            monthly =
                principal *
                (
                    monthlyRate *
                    Math.pow(
                        1 + monthlyRate,
                        months
                    )
                ) /
                (
                    Math.pow(
                        1 + monthlyRate,
                        months
                    ) - 1
                );

        }


        const total =
            monthly * months;


        const interest =
            total - principal;


        if (monthlyPayment) {

            monthlyPayment.textContent =
                formatCurrency(monthly);

        }


        if (totalRepayment) {

            totalRepayment.textContent =
                formatCurrency(total);

        }


        if (totalInterest) {

            totalInterest.textContent =
                formatCurrency(interest);

        }


        if (amountDisplay) {

            amountDisplay.textContent =
                formatCurrency(principal);

        }


        if (interestDisplay) {

            interestDisplay.textContent =
                `${annualRate}%`;

        }


        if (termDisplay) {

            termDisplay.textContent =
                `${months} months`;

        }

    }


    /*
       Recalculate whenever the
       user changes a value.
    */

    if (loanAmount) {

        loanAmount.addEventListener(
            "input",
            calculateLoan
        );

    }


    if (interestRate) {

        interestRate.addEventListener(
            "input",
            calculateLoan
        );

    }


    if (loanTerm) {

        loanTerm.addEventListener(
            "input",
            calculateLoan
        );

    }


    /*
       Run calculator once on page load.
    */

    calculateLoan();


    /* =========================================
       FAQ ACCORDION
    ========================================= */

    const faqQuestions =
        document.querySelectorAll(
            ".faq-question"
        );


    faqQuestions.forEach((question) => {

        question.addEventListener(
            "click",
            () => {

                const item =
                    question.closest(
                        ".faq-item"
                    );

                if (!item) {
                    return;
                }

                const answer =
                    item.querySelector(
                        ".faq-answer"
                    );

                const icon =
                    question.querySelector(
                        ".faq-icon"
                    );


                const isOpen =
                    item.classList.contains(
                        "active"
                    );


                /*
                   Close all other FAQ items.
                */

                document
                    .querySelectorAll(
                        ".faq-item.active"
                    )
                    .forEach((activeItem) => {

                        if (activeItem !== item) {

                            activeItem.classList.remove(
                                "active"
                            );

                            const activeAnswer =
                                activeItem.querySelector(
                                    ".faq-answer"
                                );

                            const activeIcon =
                                activeItem.querySelector(
                                    ".faq-icon"
                                );


                            if (activeAnswer) {

                                activeAnswer.style.display =
                                    "none";

                            }


                            if (activeIcon) {

                                activeIcon.textContent =
                                    "+";

                            }

                        }

                    });


                /*
                   Toggle current FAQ.
                */

                if (isOpen) {

                    item.classList.remove(
                        "active"
                    );

                    if (answer) {

                        answer.style.display =
                            "none";

                    }

                    if (icon) {

                        icon.textContent =
                            "+";

                    }

                } else {

                    item.classList.add(
                        "active"
                    );

                    if (answer) {

                        answer.style.display =
                            "block";

                    }

                    if (icon) {

                        icon.textContent =
                            "−";

                    }

                }

            }
        );

    });


    /*
       Hide FAQ answers initially.
    */

    document
        .querySelectorAll(
            ".faq-item:not(.active) .faq-answer"
        )
        .forEach((answer) => {

            answer.style.display = "none";

        });


    /* =========================================
       APPLICATION FORM
    ========================================= */

    const applicationForm =
        document.querySelector(
            "#applicationForm"
        );


    if (applicationForm) {

        applicationForm.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();


                /*
                   Basic validation.
                */

                if (
                    !applicationForm.checkValidity()
                ) {

                    applicationForm.reportValidity();

                    return;

                }


                const existingAlert =
                    applicationForm.querySelector(
                        ".form-alert"
                    );


                if (existingAlert) {

                    existingAlert.remove();

                }


                const alert =
                    document.createElement(
                        "div"
                    );


                alert.className =
                    "alert alert-success form-alert";


                alert.textContent =
                    "Thank you. Your application has been received. Our team will review your information and contact you."


                applicationForm.prepend(alert);


                /*
                   NOTE:
                   This currently does NOT send
                   the application to a database.

                   A backend/API will be added later.
                */


                applicationForm.reset();


                window.scrollTo({
                    top:
                        applicationForm.offsetTop - 120,
                    behavior: "smooth"
                });

            }
        );

    }


    /* =========================================
       CONTACT FORM
    ========================================= */

    const contactForm =
        document.querySelector(
            "#contactForm"
        );


    if (contactForm) {

        contactForm.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();


                if (
                    !contactForm.checkValidity()
                ) {

                    contactForm.reportValidity();

                    return;

                }


                const existingAlert =
                    contactForm.querySelector(
                        ".form-alert"
                    );


                if (existingAlert) {

                    existingAlert.remove();

                }


                const alert =
                    document.createElement(
                        "div"
                    );


                alert.className =
                    "alert alert-success form-alert";


                alert.textContent =
                    "Your message has been submitted successfully. We will get back to you as soon as possible.";


                contactForm.prepend(alert);


                contactForm.reset();

            }
        );

    }


    /* =========================================
       LOAN APPLICATION LOAN TYPE
    ========================================= */

    const loanType =
        document.querySelector(
            "#loanType"
        );


    const businessFields =
        document.querySelector(
            "#businessFields"
        );


    if (loanType && businessFields) {

        function toggleBusinessFields() {

            if (
                loanType.value ===
                "business"
            ) {

                businessFields.style.display =
                    "block";

            } else {

                businessFields.style.display =
                    "none";

            }

        }


        loanType.addEventListener(
            "change",
            toggleBusinessFields
        );


        toggleBusinessFields();

    }


    /* =========================================
       LOAN AMOUNT DISPLAY
    ========================================= */

    const amountRange =
        document.querySelector(
            "#loanAmountRange"
        );

    const amountRangeDisplay =
        document.querySelector(
            "#loanAmountRangeDisplay"
        );


    if (
        amountRange &&
        amountRangeDisplay
    ) {

        function updateAmountRange() {

            const value =
                Number(
                    amountRange.value
                );


            amountRangeDisplay.textContent =
                formatCurrency(value);

        }


        amountRange.addEventListener(
            "input",
            updateAmountRange
        );


        updateAmountRange();

    }


    /* =========================================
       CURRENT YEAR
    ========================================= */

    const yearElements =
        document.querySelectorAll(
            ".current-year"
        );


    yearElements.forEach((element) => {

        element.textContent =
            new Date().getFullYear();

    });


    /* =========================================
       NAVBAR SCROLL EFFECT
    ========================================= */

    const navbar =
        document.querySelector(
            ".navbar"
        );


    if (navbar) {

        window.addEventListener(
            "scroll",
            () => {

                if (window.scrollY > 30) {

                    navbar.classList.add(
                        "navbar-scrolled"
                    );

                } else {

                    navbar.classList.remove(
                        "navbar-scrolled"
                    );

                }

            }
        );

    }


    /* =========================================
       BUTTON LOADING STATE
    ========================================= */

    const submitButtons =
        document.querySelectorAll(
            'button[type="submit"]'
        );


    submitButtons.forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                const form =
                    button.closest("form");


                if (
                    form &&
                    !form.checkValidity()
                ) {
                    return;
                }


                /*
                   Small visual feedback.

                   Backend integration can later
                   replace this with a real loading
                   state.
                */

                setTimeout(() => {

                    button.classList.remove(
                        "loading"
                    );

                }, 100);

            }
        );

    });


    /* =========================================
       IMAGE ERROR HANDLING
    ========================================= */

    const images =
        document.querySelectorAll(
            "img"
        );


    images.forEach((image) => {

        image.addEventListener(
            "error",
            () => {

                image.style.display =
                    "none";

            }
        );

    });


    /* =========================================
       BACK TO TOP
    ========================================= */

    const backToTop =
        document.querySelector(
            "#backToTop"
        );


    if (backToTop) {

        window.addEventListener(
            "scroll",
            () => {

                if (
                    window.scrollY > 500
                ) {

                    backToTop.classList.add(
                        "show"
                    );

                } else {

                    backToTop.classList.remove(
                        "show"
                    );

                }

            }
        );


        backToTop.addEventListener(
            "click",
            () => {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );

    }


    /* =========================================
       CONSOLE MESSAGE
    ========================================= */

    console.log(
        "Jenga Capital website initialized successfully."
    );

});
function calculateLoan() {
    // your calculator code here
}


// Add this AFTER calculateLoan()
const calculateButton =
    document.querySelector("#calculateButton");

if (calculateButton) {
    calculateButton.addEventListener(
        "click",
        calculateLoan
    );
}
