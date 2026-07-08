import fitz
doc = fitz.open("attached_assets/Eddie_&_Farah_Wedding_Invite_1783431994683.pdf")
print("pages:", doc.page_count)
for i in range(min(doc.page_count, 6)):
    page = doc[i]
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    pix.save(f".agents/outputs/page_{i+1}.png")
    print("saved", i+1)
