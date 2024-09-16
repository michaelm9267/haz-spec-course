import json
import PyPDF2

# Function to extract table data from PDF
def extract_table_data_from_pdf(pdf_path):
    table_data = []
    with open(pdf_path, 'rb') as pdf_file:
        reader = PyPDF2.PdfReader(pdf_file)
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num].extract_text()
            lines = page.split('\n')
            for line in lines:
                # Look for hazardous substance data lines (example pattern: substance, quantity lbs, quantity kg)
                if any(char.isdigit() for char in line) and '(' in line and ')' in line:
                    try:
                        parts = line.split()
                        substance = ' '.join(parts[:-2])
                        reportable_quantity_lbs = parts[-2].replace('(', '').replace(')', '')
                        reportable_quantity_kg = parts[-1].replace('(', '').replace(')', '')
                        table_data.append({
                            "substance": substance,
                            "reportable_quantity_lbs": reportable_quantity_lbs,
                            "reportable_quantity_kg": reportable_quantity_kg
                        })
                    except Exception as e:
                        # Skip malformed lines
                        continue
    return table_data

# Write the extracted data to a JSON file
def write_to_json(data, output_path):
    with open(output_path, 'w') as json_file:
        json.dump(data, json_file, indent=4)

# Path to your uploaded PDF
pdf_path = '/Users/michaelmay/Documents/coding/ReactApps/haz-spec-course/src/data-file/AFMAN 24-604- Table A4.3.pdf'
output_json_path = 'src/data-file/hazardous_substances.json'

# Extract the data
hazardous_substances_data = extract_table_data_from_pdf(pdf_path)

# Write the data to a JSON file
write_to_json(hazardous_substances_data, output_json_path)

print(f"Data has been extracted and saved to {output_json_path}")
