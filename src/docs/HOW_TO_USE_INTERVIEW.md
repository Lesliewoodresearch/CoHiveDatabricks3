# How to Use the Interview Feature

Quick guide for using the AI Interview feature in the Wisdom hex.

---

## 🎯 What It Does

The interview feature helps you share insights through a conversational Q&A format. An AI interviewer (or pre-written questions) guides you through 5 questions to extract deeper knowledge.

---

## 📋 Step-by-Step Guide

### **1. Navigate to Wisdom Hex**
- Click on the **Wisdom** hexagon in the workflow
- Complete the Enter/Launch step first if needed

### **2. Select Interview Option**
- **Question 1:** Choose your insight type (Brand, Category, or General)
- **Question 2:** Select "**Be Interviewed**" as your input method

### **3. Start the Interview**
- Click the **"Start Interview"** button
- Wait for the AI to ask the first question (this may take a few seconds)

### **4. Answer Questions**
There are **5 questions total**. For each question:

**Option A: Type Your Answer**
1. Type in the text box
2. Press **Enter** (or click Send button)
3. Wait for next question

**Option B: Use Voice Input** (if available)
1. Click the **microphone icon**
2. Speak your answer
3. Click Send when done

### **5. Complete & Save**
- After answering all 5 questions, you'll see: "✓ Interview complete!"
- Click **"Save to Knowledge Base"**
- Your transcript will be saved to Databricks
- A success message will appear

---

## 🔧 If Something Goes Wrong

### **Error: "Failed to Start Interview"**

**You'll see an error screen with three options:**

1. **Close** - Cancel and try a different input method
2. **Try Again** - Retry with AI (if you fixed the issue)
3. **Use Fallback Questions** - Switch to pre-written questions (no AI needed)

**Common causes:**
- Not signed in to Databricks → Click "Sign In" in header first
- Network connection issue → Check your internet
- AI model not available → Use fallback questions

### **Recommended: Use Fallback Questions**

If AI isn't working, click **"Use Fallback Questions"** to proceed with:
- 5 curated questions based on your insight type
- Works without AI or internet (after auth)
- Still saves to Knowledge Base
- Same value as AI interview

---

## 💡 Tips for Great Answers

**Be Specific:**
- Include examples, data, or evidence
- Mention specific brands, products, or campaigns
- Share concrete observations

**Be Detailed:**
- Aim for 2-3 sentences minimum per answer
- Explain the "why" behind your insights
- Provide context others might not have

**Think Ahead:**
- Consider how others will use this insight
- Include actionable recommendations
- Flag any caveats or limitations

---

## 🎤 Voice Input Tips

**For best results:**
- Speak clearly and at normal pace
- Use a quiet environment
- Keep answers under 30 seconds per take
- Review text before sending (voice recognition isn't perfect)

**Browser support:**
- ✅ Chrome (recommended)
- ✅ Edge
- ⚠️ Safari (limited)
- ❌ Firefox (not supported)

---

## 📝 Sample Interview

**Insight Type:** Brand  
**Brand:** Nike  
**Project Type:** Creative Messaging

---

**Q1:** What unique characteristics define this brand's identity?

**Your Answer:** Nike is fundamentally about empowerment and achievement. Their "Just Do It" ethos isn't just a tagline - it's embedded in everything from product design to athlete partnerships. Unlike competitors who focus on technical specs, Nike sells aspiration and personal transformation.

---

**Q2:** What challenges or opportunities do you see for this brand?

**Your Answer:** The main challenge is staying authentic while expanding to wellness and lifestyle beyond sports. Opportunity: Gen Z values sustainability and social issues - Nike could lead in eco-innovation while maintaining performance. Their Move to Zero campaign shows this is already a strategic focus.

---

**Q3:** How does this brand's audience perceive it compared to competitors?

**Your Answer:** Nike is seen as the "premium motivator" - people buy it for identity and status, not just function. Adidas is viewed as more accessible/trendy, Under Armour as technical/serious. Nike owns the emotional territory of personal excellence, which commands price premium and loyalty.

---

**Q4:** What insights about this brand would be valuable for future projects?

**Your Answer:** Three key insights: (1) Nike's most engaged audiences are "strivers" not elite athletes - messaging should speak to effort over achievement. (2) Their digital ecosystem (apps, membership) creates data on individual fitness journeys - huge personalization opportunity. (3) Collaborations (Off-White, Sacai) drive cultural relevance with younger audiences.

---

**Q5:** What would you recommend for strengthening this brand's position?

**Your Answer:** Double down on community-building through local running clubs and training programs - creates emotional bonds beyond products. Invest in adaptive/inclusive design for disabilities - aligns with brand values and untapped market. Leverage athlete data to create hyper-personalized training content that positions Nike as a performance partner, not just a product seller.

---

**Result:** All 5 answers captured! Saved to Knowledge Base as:
- File: `Wisdom_Brand_Interview_1709481234567.txt`
- Tagged: Brand, Nike, Interview, Creative Messaging
- Available to entire team

---

## ❓ FAQ

**Q: How long does an interview take?**  
A: 5-15 minutes depending on answer depth. No time limit.

**Q: Can I edit my answers?**  
A: No live editing, but you can start a new interview anytime.

**Q: Who can see my interview?**  
A: All team members with Knowledge Base access. Interviews are shared, not private.

**Q: Can I save progress and finish later?**  
A: Not currently - must complete in one session. Feature coming soon!

**Q: What if I don't know an answer?**  
A: Say "I don't have insights on this specific aspect" and move on. Partial knowledge is still valuable.

**Q: How are interviews used?**  
A: Other team members can search/read them in Knowledge Base. Also used to train AI agents on organizational knowledge.

---

## 🔗 Related Features

- **Text Input:** Write freeform insights without Q&A structure
- **Voice Recording:** Record audio notes (not transcribed into Q&A)
- **File Upload:** Share existing documents, PDFs, presentations

All methods save to the same Knowledge Base!

---

**Need Help?** Contact your CoHive administrator or check `/docs/INTERVIEW_FIX_COMPLETE.md` for technical details.
