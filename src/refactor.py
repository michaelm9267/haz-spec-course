import csv
import json
import os

def csv_to_json(csv_file_path, json_file_path):
    # Check if the file exists before trying to open it
    if not os.path.exists(csv_file_path):
        print(f"Error: File '{csv_file_path}' not found!")
        return

    # Read the CSV and add data to a dictionary
    data = []
    with open(csv_file_path, encoding='utf-8') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        for row in csv_reader:
            data.append(row)
    
    # Write the data to a JSON file
    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json.dump(data, json_file, indent=4)

# Use absolute paths to avoid file path issues
csv_file_path = '/Users/michaelmay/Documents/coding/ReactApps/haz-spec-course/src/data-file/afman.csv'
json_file_path = '/Users/michaelmay/Documents/coding/ReactApps/haz-spec-course/src/data-file/output.json'

# Call the function to convert CSV to JSON
csv_to_json(csv_file_path, json_file_path)
